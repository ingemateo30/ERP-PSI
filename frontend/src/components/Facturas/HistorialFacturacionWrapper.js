// frontend/src/components/Facturas/HistorialFacturacionWrapper.js
// VERSIÓN CORREGIDA - Soluciona problemas de endpoints y carga de datos

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

    // ==========================================
    // FUNCIONES PRINCIPALES CORREGIDAS
    // ==========================================

    // Cargar lista de clientes al montar el componente
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const modoDemo = urlParams.get('demo') === 'true';

        if (modoDemo) {
            console.log('🎭 Modo demo activado');
            cargarDatosPrueba();
        } else {
            cargarClientes();
        }
    }, []);

    // CORREGIDO: Función principal para cargar clientes
    const cargarClientes = async () => {
        try {
            setLoading(true);
            setError('');

            console.log('🔄 Iniciando carga de clientes usando servicio...');

            // CORRECCIÓN: Usar el servicio que ya funciona en otras secciones
            let response;
            try {
                // Intentar usar el servicio de clientes (si existe)
                const clientesService = await import('../../services/clientService');
                response = await clientesService.default.obtenerTodos({
                    page: 1,
                    limit: 100
                });
            } catch (serviceError) {
                console.log('⚠️ Servicio de clientes no encontrado, probando apiService...');
                try {
                    // Intentar usar apiService genérico
                    const apiService = await import('../../services/apiService');
                    response = await apiService.default.get('/clients', {
                        page: 1,
                        limit: 100
                    });
                } catch (apiError) {
                    console.log('⚠️ apiService no encontrado, usando fetch directo...');
                    throw new Error('No se encontró servicio de API configurado');
                }
            }

            console.log('📊 Respuesta del servicio:', response);

            // Extraer datos según la estructura del servicio
            let clientesArray = [];

            if (response.data && Array.isArray(response.data)) {
                clientesArray = response.data;
            } else if (response.success && Array.isArray(response.data)) {
                clientesArray = response.data;
            } else if (Array.isArray(response)) {
                clientesArray = response;
            } else {
                console.warn('⚠️ Estructura de respuesta del servicio:', response);
                throw new Error('Estructura de respuesta no válida del servicio');
            }

            if (clientesArray.length === 0) {
                throw new Error('No hay clientes en la base de datos');
            }

            // Validar y normalizar clientes
            const clientesValidados = clientesArray.map(cliente => ({
                id: cliente.id,
                nombre: cliente.nombre || `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim(),
                nombres: cliente.nombres || '',
                apellidos: cliente.apellidos || '',
                identificacion: cliente.identificacion || cliente.numero_documento || '',
                numero_documento: cliente.numero_documento || cliente.identificacion || '',
                tipo_documento: cliente.tipo_documento || 'CC',
                telefono: cliente.telefono || 'No disponible',
                email: cliente.email || cliente.correo || '',
                correo: cliente.correo || cliente.email || '',
                direccion: cliente.direccion || 'No disponible',
                estado: cliente.estado || 'activo'
            }));

            setClientes(clientesValidados);
            setError('');
            console.log(`✅ ${clientesValidados.length} clientes cargados exitosamente usando servicio`);

        } catch (error) {
            console.error('❌ Error cargando clientes:', error);
            setError(`Error: ${error.message}. Usando datos de prueba.`);
            cargarDatosPrueba();
        } finally {
            setLoading(false);
        }
    };

    // CORREGIDO: Función principal para cargar facturas del cliente
const cargarFacturasCliente = async () => {
  if (!clienteSeleccionado) return;

  // DEBUGGING: Verificar cliente seleccionado
  console.log('👤 Cliente seleccionado completo:', clienteSeleccionado);
  console.log('🆔 Cliente ID:', clienteSeleccionado.id, 'Tipo:', typeof clienteSeleccionado.id);
  
  if (!clienteSeleccionado.id) {
    setError('Cliente seleccionado no tiene ID válido');
    return;
  }

  try {
    setLoadingFacturas(true);
    setError('');
    
    console.log(`🧾 Cargando historial para cliente ID: ${clienteSeleccionado.id}`);
    
    // CORRECCIÓN: Importar el servicio correctamente
    const { facturacionManualService } = await import('../../services/facturacionManualService');
    
    const params = {
      cliente_id: clienteSeleccionado.id,
      page: 1,
      limit: filtros.limite
    };

    // Agregar filtros opcionales
    if (filtros.estado !== 'todas') {
      params.estado = filtros.estado;
    }
    
    if (filtros.fecha_desde) {
      params.fecha_desde = filtros.fecha_desde;
    }
    
    if (filtros.fecha_hasta) {
      params.fecha_hasta = filtros.fecha_hasta;
    }

    console.log('📋 Parámetros enviados al servicio:', params);
    
    const response = await facturacionManualService.obtenerHistorialCliente(params);
    
    console.log('📊 Respuesta del servicio:', response);
    
    let facturasCargadas = response.facturas || [];
    
    if (facturasCargadas.length === 0) {
      console.log('📝 No hay facturas reales, usando datos de prueba...');
      facturasCargadas = generarFacturasPrueba(clienteSeleccionado.id);
      setError('📝 No hay facturas reales para este cliente - Mostrando datos de ejemplo');
    } else {
      console.log(`✅ ${facturasCargadas.length} facturas reales encontradas`);
      setError(''); // Limpiar error si hay datos reales
    }
    
    // Normalizar facturas (tanto reales como de prueba)
    const facturasNormalizadas = facturasCargadas.map(factura => ({
      id: factura.id,
      numero_factura: factura.numero_factura || `FAC-${factura.id}`,
      cliente_id: factura.cliente_id || clienteSeleccionado.id,
      fecha_factura: factura.fecha_factura || factura.fecha_emision,
      fecha_emision: factura.fecha_emision || factura.fecha_factura,
      fecha_vencimiento: factura.fecha_vencimiento,
      periodo: factura.periodo,
      total: parseFloat(factura.total || 0),
      subtotal: parseFloat(factura.subtotal || 0),
      iva: parseFloat(factura.iva || 0),
      estado: factura.estado || 'pendiente',
      observaciones: factura.observaciones,
      items: factura.detalles || factura.items || [],
      pagos: factura.pagos || [],
      total_pagado: 0,
      saldo_pendiente: parseFloat(factura.total || 0)
    }));
    
    // Calcular totales pagados para cada factura
    facturasNormalizadas.forEach(factura => {
      if (factura.pagos && factura.pagos.length > 0) {
        factura.total_pagado = factura.pagos.reduce((sum, pago) => 
          sum + parseFloat(pago.valor_pagado || pago.monto || 0), 0
        );
        factura.saldo_pendiente = factura.total - factura.total_pagado;
      }
    });
    
    setFacturas(facturasNormalizadas);
    
    // Usar estadísticas del backend si están disponibles
    if (response.estadisticas && Object.keys(response.estadisticas).length > 0) {
      setEstadisticas({
        total_facturas: response.estadisticas.total_facturas || 0,
        total_pagadas: response.estadisticas.pagadas || 0,
        total_pendientes: response.estadisticas.pendientes || 0,
        monto_total: parseFloat(response.estadisticas.valor_total || 0),
        monto_pagado: parseFloat(response.estadisticas.valor_pagado || 0),
        monto_pendiente: parseFloat(response.estadisticas.valor_pendiente || 0)
      });
    } else {
      // Calcular estadísticas localmente
      calcularEstadisticas(facturasNormalizadas);
    }
    
    console.log(`✅ ${facturasNormalizadas.length} facturas procesadas y cargadas`);
    
  } catch (error) {
    console.error('❌ Error cargando historial desde servicio:', error);
    setError(`Error del servicio: ${error.message}. Usando datos de prueba.`);
    
    // Fallback a datos de prueba
    const facturasPrueba = generarFacturasPrueba(clienteSeleccionado.id);
    setFacturas(facturasPrueba);
    calcularEstadisticas(facturasPrueba);
  } finally {
    setLoadingFacturas(false);
  }
};
    // CORREGIDO: Función para generar facturas de prueba más realistas
    const generarFacturasPrueba = (clienteId) => {
        const estados = ['pagada', 'pendiente', 'vencida'];
        const facturasPrueba = [];

        for (let i = 1; i <= 6; i++) {
            const fechaBase = new Date();
            fechaBase.setMonth(fechaBase.getMonth() - i);

            const estado = estados[Math.floor(Math.random() * estados.length)];
            const total = 45000 + (Math.random() * 25000);

            facturasPrueba.push({
                id: 1000 + i,
                numero_factura: `FAC-2024-${String(1000 + i).padStart(6, '0')}`,
                cliente_id: clienteId,
                fecha_factura: fechaBase.toISOString().split('T')[0],
                fecha_emision: fechaBase.toISOString().split('T')[0],
                fecha_vencimiento: new Date(fechaBase.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                periodo: `${fechaBase.getFullYear()}-${String(fechaBase.getMonth() + 1).padStart(2, '0')}`,
                total: total.toFixed(2),
                estado: estado,
                subtotal: (total * 0.84).toFixed(2),
                iva: (total * 0.16).toFixed(2),
                observaciones: `Factura ${estado} - Período ${fechaBase.getFullYear()}-${String(fechaBase.getMonth() + 1).padStart(2, '0')}`,
                items: [
                    {
                        concepto: 'Servicio Internet',
                        cantidad: 1,
                        valor_unitario: total * 0.7,
                        total: total * 0.7
                    },
                    {
                        concepto: 'Servicio TV',
                        cantidad: 1,
                        valor_unitario: total * 0.3,
                        total: total * 0.3
                    }
                ],
                pagos: estado === 'pagada' ? [
                    {
                        fecha_pago: new Date(fechaBase.getTime() + (10 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                        monto: total,
                        metodo_pago: 'Transferencia'
                    }
                ] : []
            });
        }

        return facturasPrueba.reverse();
    };

    // CORREGIDO: Cargar facturas cuando se selecciona un cliente o cambian los filtros
    useEffect(() => {
        if (clienteSeleccionado) {
            cargarFacturasCliente();
        }
    }, [clienteSeleccionado, filtros]);

    // ==========================================
    // FUNCIONES DE UTILIDAD MEJORADAS
    // ==========================================

    const cargarDatosPrueba = () => {
        const clientesPrueba = [
            {
                id: 1,
                nombre: 'Juan Carlos Pérez García',
                nombres: 'Juan Carlos',
                apellidos: 'Pérez García',
                tipo_documento: 'CC',
                numero_documento: '12345678',
                identificacion: '12345678',
                telefono: '300-123-4567',
                email: 'juan.perez@email.com',
                correo: 'juan.perez@email.com',
                direccion: 'Calle 123 #45-67',
                estado: 'activo'
            },
            {
                id: 2,
                nombre: 'María Elena Rodríguez López',
                nombres: 'María Elena',
                apellidos: 'Rodríguez López',
                tipo_documento: 'CC',
                numero_documento: '87654321',
                identificacion: '87654321',
                telefono: '301-987-6543',
                email: 'maria.rodriguez@email.com',
                correo: 'maria.rodriguez@email.com',
                direccion: 'Carrera 89 #12-34',
                estado: 'activo'
            },
            {
                id: 3,
                nombre: 'Carlos Alberto Gómez Martínez',
                nombres: 'Carlos Alberto',
                apellidos: 'Gómez Martínez',
                tipo_documento: 'CC',
                numero_documento: '11223344',
                identificacion: '11223344',
                telefono: '302-555-7890',
                email: 'carlos.gomez@email.com',
                correo: 'carlos.gomez@email.com',
                direccion: 'Avenida 56 #78-90',
                estado: 'activo'
            }
        ];

        setClientes(clientesPrueba);
        setError('🎭 Modo demo - Datos de prueba cargados. Para usar datos reales, quite ?demo=true de la URL');
        setLoading(false);
    };

    const buscarClientes = async (termino) => {
        if (!termino.trim()) {
            return;
        }

        try {
            setLoading(true);

            const clientesFiltrados = clientes.filter(cliente => {
                const nombre = (cliente.nombre || `${cliente.nombres || ''} ${cliente.apellidos || ''}`).toLowerCase();
                const identificacion = (cliente.identificacion || cliente.numero_documento || '').toLowerCase();
                const telefono = (cliente.telefono || '').toLowerCase();

                return nombre.includes(termino.toLowerCase()) ||
                    identificacion.includes(termino.toLowerCase()) ||
                    telefono.includes(termino.toLowerCase());
            });

            setClientes(clientesFiltrados);
        } catch (error) {
            console.error('Error buscando clientes:', error);
        } finally {
            setLoading(false);
        }
    };

 const cargarFacturas = async (clienteId) => {
  try {
    setLoadingFacturas(true);
    setError(null);
    
    const response = await facturasService.getHistorialCliente(clienteId);
    
    if (response.success) {
      const facturasData = response.data || [];
      setFacturas(facturasData);
      
      // ✅ PRIORIDAD 1: Usar estadísticas del BACKEND (totales reales)
      if (response.estadisticas && Object.keys(response.estadisticas).length > 0) {
        console.log('✅ Usando estadísticas del BACKEND:', response.estadisticas);
        setEstadisticas({
          total_facturas: parseInt(response.estadisticas.total_facturas || response.estadisticas.total || 0),
          total_pagadas: parseInt(response.estadisticas.pagadas || response.estadisticas.total_pagadas || 0),
          total_pendientes: parseInt(response.estadisticas.pendientes || response.estadisticas.total_pendientes || 0),
          total_vencidas: parseInt(response.estadisticas.vencidas || response.estadisticas.total_vencidas || 0),
          monto_total: parseFloat(response.estadisticas.valor_total || response.estadisticas.monto_total || 0),
          monto_pagado: parseFloat(response.estadisticas.valor_pagado || response.estadisticas.monto_pagado || 0),
          monto_pendiente: parseFloat(response.estadisticas.valor_pendiente || response.estadisticas.monto_pendiente || 0)
        });
      } else {
        // ✅ FALLBACK: Solo si backend no envía estadísticas
        console.warn('⚠️ Backend sin estadísticas, calculando localmente');
        calcularEstadisticasLocal(facturasData);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    setError(error.message);
  } finally {
    setLoadingFacturas(false);
  }
};

// Función de respaldo (solo usar si backend falla)
const calcularEstadisticasLocal = (facturasList) => {
  if (!Array.isArray(facturasList) || facturasList.length === 0) {
    setEstadisticas({
      total_facturas: 0, total_pagadas: 0, total_pendientes: 0, total_vencidas: 0,
      monto_total: 0, monto_pagado: 0, monto_pendiente: 0
    });
    return;
  }
  
  // ⚠️ ADVERTENCIA: Esto solo cuenta las facturas CARGADAS, no el total real
  console.warn('⚠️ Calculando con datos locales - puede no ser el total real');
  
  const stats = facturasList.reduce((acc, factura) => {
    const total = parseFloat(factura.total || 0);
    acc.total_facturas++;
    acc.monto_total += total;

    if (factura.estado === 'pagada') {
      acc.total_pagadas++;
      acc.monto_pagado += total;
    } else if (factura.estado === 'vencida') {
      acc.total_vencidas++;
      acc.monto_pendiente += total;
    } else {
      acc.total_pendientes++;
      acc.monto_pendiente += total;
    }

    return acc;
  }, {
    total_facturas: 0, total_pagadas: 0, total_pendientes: 0, total_vencidas: 0,
    monto_total: 0, monto_pagado: 0, monto_pendiente: 0
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
            const endpoints = [
                `/api/v1/facturas/${factura.id}`,
                `/api/v1/facturacion/facturas/${factura.id}`
            ];

            let facturaCompleta = null;

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            facturaCompleta = data.data;
                            break;
                        }
                    }
                } catch (error) {
                    console.log(`Error en endpoint ${endpoint}:`, error.message);
                }
            }

            // Si no se puede obtener el detalle, usar los datos básicos
            setFacturaDetalle(facturaCompleta || factura);

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
            if (valor.trim()) {
                buscarClientes(valor);
            } else {
                cargarClientes();
            }
        }, 300);
    };

    const seleccionarCliente = (cliente) => {
        console.log('👤 Cliente seleccionado:', cliente);
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
        const API_URL = process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1';
        const response = await fetch(`${API_URL}/facturas/${facturaId}/pdf`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

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
        } else {
            alert('No se pudo descargar la factura.');
        }
    } catch (error) {
        console.error('Error descargando factura:', error);
        alert('Error descargando factura');
    }
};
    // ==========================================
    // RENDERIZADO PRINCIPAL
    // ==========================================

    if (error && !clientes.length && !clienteSeleccionado) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <div className="space-x-3">
                            <button
                                onClick={cargarClientes}
                                className="inline-flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reintentar
                            </button>
                            <button
                                onClick={() => window.location.href = '/?demo=true'}
                                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Cargar Demo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Historial de Facturación</h1>
                    <p className="text-gray-600">Consulte el historial completo de facturas por cliente</p>
                    {error && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Selección de Cliente */}
                {mostrarBuscador ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center mb-4">
                            <Users className="w-5 h-5 text-[#0e6493] mr-2" />
                            <h2 className="text-xl font-semibold text-gray-900">Seleccionar Cliente</h2>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, identificación o teléfono..."
                                value={busquedaCliente}
                                onChange={handleBusquedaChange}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                            />
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="w-6 h-6 animate-spin text-[#0e6493] mr-2" />
                                <span className="text-gray-600">Cargando clientes...</span>
                            </div>
                        ) : (
                            <div className="grid gap-3 max-h-96 overflow-y-auto">
                                {clientes.length > 0 ? (
                                    clientes.map((cliente) => (
                                        <div
                                            key={cliente.id}
                                            onClick={() => seleccionarCliente(cliente)}
                                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium text-gray-900">
                                                        {cliente.nombre || `${cliente.nombres || ''} ${cliente.apellidos || ''}`}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {cliente.identificacion || cliente.numero_documento} • {cliente.telefono}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{cliente.direccion}</p>
                                                </div>
                                                <span className={`px-2 py-1 text-xs rounded-full ${cliente.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {cliente.estado}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                        <p className="text-gray-500">No se encontraron clientes</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Cliente Seleccionado */
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                    {clienteSeleccionado.nombre || `${clienteSeleccionado.nombres || ''} ${clienteSeleccionado.apellidos || ''}`}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                    <div>
                                        <strong>Identificación:</strong> {clienteSeleccionado.identificacion || clienteSeleccionado.numero_documento}
                                    </div>
                                    <div>
                                        <strong>Teléfono:</strong> {clienteSeleccionado.telefono}
                                    </div>
                                    <div>
                                        <strong>Email:</strong> {clienteSeleccionado.email || clienteSeleccionado.correo || 'No disponible'}
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                    <strong>Dirección:</strong> {clienteSeleccionado.direccion}
                                </div>
                            </div>
                            <button
                                onClick={limpiarSeleccion}
                                className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cambiar Cliente
                            </button>
                        </div>

                        {/* Estadísticas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <FileText className="w-8 h-8 text-blue-600 mb-2" />
                                    <div className="ml-3">
                                        <p className="text-2xl font-bold text-gray-900">{estadisticas.total_facturas}</p>
                                        <p className="text-sm text-gray-600">Total Facturas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                                    <div className="ml-3">
                                        <p className="text-2xl font-bold text-gray-900">{estadisticas.total_pagadas}</p>
                                        <p className="text-sm text-gray-600">Pagadas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <Clock className="w-8 h-8 text-yellow-600 mb-2" />
                                    <div className="ml-3">
                                        <p className="text-2xl font-bold text-gray-900">{estadisticas.total_pendientes}</p>
                                        <p className="text-sm text-gray-600">Pendientes</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <DollarSign className="w-8 h-8 text-gray-600 mb-2" />
                                    <div className="ml-3">
                                        <p className="text-lg font-bold text-gray-900">{formatearMoneda(estadisticas.monto_total)}</p>
                                        <p className="text-sm text-gray-600">Total Facturado</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <DollarSign className="w-8 h-8 text-green-600 mb-2" />
                                    <div className="ml-3">
                                        <p className="text-lg font-bold text-gray-900">{formatearMoneda(estadisticas.monto_pagado)}</p>
                                        <p className="text-sm text-gray-600">Total Pagado</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                    <DollarSign className="w-8 h-8 text-red-600 mb-2" />
                                    <div className="ml-3">
                                        <p className="text-lg font-bold text-gray-900">{formatearMoneda(estadisticas.monto_pendiente)}</p>
                                        <p className="text-sm text-gray-600">Saldo Pendiente</p>
                                    </div>
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
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                </select>
                            </div>
                        </div>

                        {/* Lista de Facturas */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <FileText className="w-5 h-5 mr-2" />
                                    Facturas del Cliente
                                </h3>
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
                                                {formatearFecha(factura.fecha_factura || factura.fecha_emision)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatearFecha(factura.fecha_vencimiento)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatearMoneda(factura.total)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(factura.estado)}`}>
                                                    {factura.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => verDetalleFactura(factura)}
                                                        className="text-[#0e6493] hover:text-[#0e6493]/80 transition-colors"
                                                        title="Ver detalle"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => descargarFactura(factura.id)}
                                                        className="text-green-600 hover:text-green-800 transition-colors"
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

                            {facturas.length === 0 && !loadingFacturas && (
                                <div className="text-center py-8">
                                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <p className="text-gray-500">No se encontraron facturas para este cliente</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Modal de Detalle de Factura */}
                {facturaDetalle && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            Detalle de Factura {facturaDetalle.numero_factura || `#${facturaDetalle.id}`}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {clienteSeleccionado.nombre || `${clienteSeleccionado.nombres || ''} ${clienteSeleccionado.apellidos || ''}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setFacturaDetalle(null)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                {/* Información básica */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">Información de la Factura</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Número:</span>
                                                <span className="font-medium">{facturaDetalle.numero_factura || `#${facturaDetalle.id}`}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Fecha Emisión:</span>
                                                <span className="font-medium">{formatearFecha(facturaDetalle.fecha_factura || facturaDetalle.fecha_emision)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Fecha Vencimiento:</span>
                                                <span className="font-medium">{formatearFecha(facturaDetalle.fecha_vencimiento)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Estado:</span>
                                                <span className={`px-2 py-1 text-xs rounded-full ${getEstadoColor(facturaDetalle.estado)}`}>
                                                    {facturaDetalle.estado}
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
                                        <h4 className="font-semibold text-gray-900 mb-3">Totales</h4>
                                        <div className="space-y-2 text-sm">
                                            {facturaDetalle.subtotal && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Subtotal:</span>
                                                    <span className="font-medium">{formatearMoneda(facturaDetalle.subtotal)}</span>
                                                </div>
                                            )}
                                            {facturaDetalle.iva && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">IVA:</span>
                                                    <span className="font-medium">{formatearMoneda(facturaDetalle.iva)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between border-t pt-2">
                                                <span className="text-gray-900 font-semibold">Total:</span>
                                                <span className="font-bold text-lg">{formatearMoneda(facturaDetalle.total)}</span>
                                            </div>
                                            {facturaDetalle.saldo_pendiente !== undefined && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Total Pagado:</span>
                                                        <span className="font-medium text-green-600">
                                                            {formatearMoneda((facturaDetalle.total_pagado || 0))}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Saldo Pendiente:</span>
                                                        <span className="font-medium text-red-600">
                                                            {formatearMoneda(facturaDetalle.saldo_pendiente)}
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
                                                        {formatearMoneda(pago.monto || pago.valor_pagado)}
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