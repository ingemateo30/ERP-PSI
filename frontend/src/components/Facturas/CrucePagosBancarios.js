
// frontend/src/components/Facturas/CrucePagosBancarios.js
import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import {
    DollarSign,
    Calendar,
    Search,
    Filter,
    Download,
    Check,
    X,
    Building,
    FileText,
    CreditCard,
    AlertCircle,
    Eye,
    History,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Wallet,
    BarChart3
} from 'lucide-react';

const CrucePagosBancarios = () => {
    const [facturasPendientes, setFacturasPendientes] = useState([]);
    const [facturasPagadas, setFacturasPagadas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingPagadas, setLoadingPagadas] = useState(false);
    const [estadisticas, setEstadisticas] = useState(null);
    const [loadingEstadisticas, setLoadingEstadisticas] = useState(false);
    
    // NUEVO: Estado para mostrar/ocultar filtros avanzados
    const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
    const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
    
    const [filtros, setFiltros] = useState({
        banco: '',
        fecha_inicio: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        busqueda: ''
    });
    
    const [filtrosPagadas, setFiltrosPagadas] = useState({
        banco: '',
        fecha_inicio: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        busqueda: '',
        metodo_pago: '' // NUEVO: Filtro por método de pago
    });
    
    const [mostrarModalCruce, setMostrarModalCruce] = useState(false);
    const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
    const [datosPago, setDatosPago] = useState({
        monto: '',
        referencia: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        banco_id: '',
        metodo_pago: 'transferencia',
        observaciones: ''
    });

    // ✅ DESPUÉS (CORRECTO - IDs de la base de datos):
const bancos = [
    { id: 1, nombre: 'Banco de Bogotá', codigo: '001' },
    { id: 2, nombre: 'Banco Popular', codigo: '002' },
    { id: 3, nombre: 'Bancolombia', codigo: '007' },
    { id: 4, nombre: 'Citibank', codigo: '009' },
    { id: 5, nombre: 'Banco GNB Sudameris', codigo: '012' },
    { id: 6, nombre: 'BBVA Colombia', codigo: '013' },
    { id: 7, nombre: 'Helm Bank', codigo: '014' },
    { id: 8, nombre: 'Banco de Occidente', codigo: '023' },
    { id: 9, nombre: 'Banco Agrario', codigo: '031' },
    { id: 10, nombre: 'Banco Unión', codigo: '040' },
    { id: 11, nombre: 'Banco AV Villas', codigo: '052' },
    { id: 12, nombre: 'Banco Davivienda', codigo: '053' },
    { id: 13, nombre: 'Efectivo', codigo: '010' }
];
    const metodosPago = [
        { value: 'efectivo', label: 'Efectivo' },
        { value: 'transferencia', label: 'Transferencia' },
        { value: 'tarjeta', label: 'Tarjeta' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'consignacion', label: 'Consignación' }
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            cargarFacturasPendientes();
        }, 300);
        
        return () => clearTimeout(timer);
    }, [filtros]);

    useEffect(() => {
        if (filtrosPagadas.fecha_inicio && filtrosPagadas.fecha_fin) {
            const fechaInicio = new Date(filtrosPagadas.fecha_inicio);
            const fechaFin = new Date(filtrosPagadas.fecha_fin);
            
            if (fechaFin >= fechaInicio) {
                const timer = setTimeout(() => {
                    cargarFacturasPagadas();
                    if (mostrarEstadisticas) {
                        cargarEstadisticas();
                    }
                }, 300);
                
                return () => clearTimeout(timer);
            }
        }
    }, [filtrosPagadas, mostrarEstadisticas]);

    const cargarFacturasPendientes = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                estado: 'pendiente',
                fecha_inicio: filtros.fecha_inicio,
                fecha_fin: filtros.fecha_fin,
                ...(filtros.busqueda && { search: filtros.busqueda })
            });

            const response = await apiService.get(`/facturacion/facturas?${params}`);
            
            if (response && response.success) {
                const facturas = Array.isArray(response.data) ? response.data : (response.data?.facturas || response.data?.data || []);
                setFacturasPendientes(facturas);
            }
        } catch (error) {
            console.error('Error cargando facturas:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarFacturasPagadas = async () => {
        try {
            setLoadingPagadas(true);
            
            const params = new URLSearchParams({
                estado: 'pagada',
                fecha_pago_inicio: filtrosPagadas.fecha_inicio,
                fecha_pago_fin: filtrosPagadas.fecha_fin
            });

            if (filtrosPagadas.busqueda) {
                params.append('search', filtrosPagadas.busqueda);
            }
            if (filtrosPagadas.banco) {
                params.append('banco_id', filtrosPagadas.banco);
            }
            if (filtrosPagadas.metodo_pago) {
                params.append('metodo_pago', filtrosPagadas.metodo_pago);
            }

            const response = await apiService.get(`/facturacion/facturas?${params.toString()}`);
            
            if (response && response.success) {
                const facturas = Array.isArray(response.data) 
                    ? response.data 
                    : (response.data?.facturas || []);
                
                setFacturasPagadas(facturas);
            } else {
                setFacturasPagadas([]);
            }
        } catch (error) {
            console.error('❌ Error cargando facturas pagadas:', error);
            setFacturasPagadas([]);
        } finally {
            setLoadingPagadas(false);
        }
    };

    // NUEVO: Cargar estadísticas
    const cargarEstadisticas = async () => {
        try {
            setLoadingEstadisticas(true);
            
            const params = new URLSearchParams({
                fecha_inicio: filtrosPagadas.fecha_inicio,
                fecha_fin: filtrosPagadas.fecha_fin
            });

            if (filtrosPagadas.banco) {
                params.append('banco_id', filtrosPagadas.banco);
            }
            if (filtrosPagadas.metodo_pago) {
                params.append('metodo_pago', filtrosPagadas.metodo_pago);
            }

            const response = await apiService.get(`/facturacion/estadisticas-pagos?${params.toString()}`);
            
            if (response && response.success) {
                setEstadisticas(response.data);
            }
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        } finally {
            setLoadingEstadisticas(false);
        }
    };

    const abrirModalCruce = (factura) => {
        setFacturaSeleccionada(factura);
        setDatosPago({
            monto: factura.total,
            referencia: '',
            fecha_pago: new Date().toISOString().split('T')[0],
            banco_id: '',
            metodo_pago: 'transferencia',
            observaciones: ''
        });
        setMostrarModalCruce(true);
    };

    const abrirModalDetalle = (factura) => {
        setFacturaSeleccionada(factura);
        setMostrarModalDetalle(true);
    };

    const cruzarPago = async () => {
        try {
            const response = await apiService.post(`/facturacion/facturas/${facturaSeleccionada.id}/pagar`, {
                valor_pagado: parseFloat(datosPago.monto),
                metodo_pago: datosPago.metodo_pago,
                referencia_pago: datosPago.referencia,
                fecha_pago: datosPago.fecha_pago,
                observaciones: datosPago.observaciones,
                banco_id: parseInt(datosPago.banco_id)
            });

            if (response && response.success) {
                alert('Pago cruzado exitosamente');
                setMostrarModalCruce(false);
                cargarFacturasPendientes();
                cargarFacturasPagadas();
                if (mostrarEstadisticas) {
                    cargarEstadisticas();
                }
            } else {
                alert('Error: ' + (response?.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error cruzando pago:', error);
            alert('Error al cruzar el pago: ' + error.message);
        }
    };

    const exportarPorBanco = async (bancoId) => {
        try {
            const banco = bancos.find(b => b.id === bancoId);
            const facturasFiltradas = facturasPendientes.filter(f =>
                filtros.banco ? f.banco_id === bancoId : true
            );

            let csvContent = '';
            const headers = ['Numero Factura', 'Cliente', 'Identificacion', 'Valor', 'Fecha Vencimiento'];

            csvContent = headers.join(',') + '\n';
            facturasFiltradas.forEach(factura => {
                const row = [
                    factura.numero_factura,
                    `"${factura.nombre_cliente}"`,
                    factura.identificacion_cliente,
                    factura.total,
                    factura.fecha_vencimiento
                ].join(',');
                csvContent += row + '\n';
            });

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `facturas_${banco.codigo}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) {
            console.error('Error exportando:', error);
            alert('Error al exportar');
        }
    };

    const facturasPendientesFiltradas = facturasPendientes.filter(f => {
        if (filtros.busqueda) {
            const busqueda = filtros.busqueda.toLowerCase();
            return (
                f.numero_factura?.toLowerCase().includes(busqueda) ||
                f.cliente_nombre?.toLowerCase().includes(busqueda) ||
                f.cliente_identificacion?.includes(busqueda)
            );
        }
        return true;
    });

    const facturasPagadasFiltradas = facturasPagadas.filter(f => {
        if (filtrosPagadas.busqueda) {
            const busqueda = filtrosPagadas.busqueda.toLowerCase();
            return (
                f.numero_factura?.toLowerCase().includes(busqueda) ||
                f.nombre_cliente?.toLowerCase().includes(busqueda) ||
                f.identificacion_cliente?.includes(busqueda)
            );
        }
        return true;
    });

    return (
        <div className="p-6 space-y-6">
            {/* TÍTULO PRINCIPAL */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    Cruce de Pagos Bancarios
                </h1>
                <p className="text-sm text-gray-600">
                    Registrar pagos de facturas pendientes
                </p>
            </div>

            {/* BOTONES DE EXPORTACIÓN */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => exportarPorBanco(5)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Exportar Comultrasan
                    </button>
                    <button
                        onClick={() => exportarPorBanco(6)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Exportar Finecoop
                    </button>
                    <button
                        onClick={() => exportarPorBanco(7)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Exportar Caja Social
                    </button>
                </div>
            </div>

            {/* FACTURAS PENDIENTES DE PAGO */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Facturas Pendientes de Pago
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={filtros.fecha_inicio}
                            onChange={(e) => {
                                const nuevaFechaInicio = e.target.value;
                                const fechaFin = new Date(filtros.fecha_fin);
                                const fechaInicio = new Date(nuevaFechaInicio);
                                
                                if (fechaInicio > fechaFin) {
                                    setFiltros({ 
                                        ...filtros, 
                                        fecha_inicio: nuevaFechaInicio,
                                        fecha_fin: nuevaFechaInicio
                                    });
                                } else {
                                    setFiltros({ ...filtros, fecha_inicio: nuevaFechaInicio });
                                }
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={filtros.fecha_fin}
                            onChange={(e) => {
                                const nuevaFechaFin = e.target.value;
                                const fechaInicio = new Date(filtros.fecha_inicio);
                                const fechaFin = new Date(nuevaFechaFin);
                                
                                if (fechaFin < fechaInicio) {
                                    setFiltros({ 
                                        ...filtros, 
                                        fecha_inicio: nuevaFechaFin,
                                        fecha_fin: nuevaFechaFin
                                    });
                                } else {
                                    setFiltros({ ...filtros, fecha_fin: nuevaFechaFin });
                                }
                            }}
                            min={filtros.fecha_inicio}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Banco
                        </label>
                        <select
                            value={filtros.banco}
                            onChange={(e) => setFiltros({ ...filtros, banco: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">Todos los bancos</option>
                            {bancos.map(banco => (
                                <option key={banco.id} value={banco.id}>{banco.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={filtros.busqueda}
                                onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                                placeholder="Factura, cliente..."
                                className="w-full pl-10 pr-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-2">Cargando...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : facturasPendientesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No hay facturas pendientes
                                    </td>
                                </tr>
                            ) : (
                                facturasPendientesFiltradas.map((factura) => (
                                    <tr key={factura.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {factura.numero_factura}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="font-medium">{factura.nombre_cliente}</div>
                                            <div className="text-gray-500">{factura.identificacion_cliente}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(factura.fecha_emision).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(factura.fecha_vencimiento).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${parseFloat(factura.total || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => abrirModalCruce(factura)}
                                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                                Cruzar Pago
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* HISTORIAL DE PAGOS CRUZADOS */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <History className="w-5 h-5 text-green-500" />
                        Historial de Pagos Cruzados
                    </h2>
                    
                    {/* NUEVO: Botón para mostrar filtros avanzados */}
                    <button
                        onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Filtros Avanzados
                        {mostrarFiltrosAvanzados ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {/* Filtros básicos (siempre visibles) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={filtrosPagadas.fecha_inicio}
                            onChange={(e) => {
                                const nuevaFechaInicio = e.target.value;
                                const fechaFin = new Date(filtrosPagadas.fecha_fin);
                                const fechaInicio = new Date(nuevaFechaInicio);
                                
                                if (fechaInicio > fechaFin) {
                                    setFiltrosPagadas({ 
                                        ...filtrosPagadas, 
                                        fecha_inicio: nuevaFechaInicio,
                                        fecha_fin: nuevaFechaInicio
                                    });
                                } else {
                                    setFiltrosPagadas({ ...filtrosPagadas, fecha_inicio: nuevaFechaInicio });
                                }
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={filtrosPagadas.fecha_fin}
                            onChange={(e) => {
                                const nuevaFechaFin = e.target.value;
                                const fechaInicio = new Date(filtrosPagadas.fecha_inicio);
                                const fechaFin = new Date(nuevaFechaFin);
                                
                                if (fechaFin < fechaInicio) {
                                    setFiltrosPagadas({ 
                                        ...filtrosPagadas, 
                                        fecha_inicio: nuevaFechaFin,
                                        fecha_fin: nuevaFechaFin
                                    });
                                } else {
                                    setFiltrosPagadas({ ...filtrosPagadas, fecha_fin: nuevaFechaFin });
                                }
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Banco
                        </label>
                        <select
                            value={filtrosPagadas.banco}
                            onChange={(e) => setFiltrosPagadas({ ...filtrosPagadas, banco: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">Todos los bancos</option>
                            {bancos.map(banco => (
                                <option key={banco.id} value={banco.id}>{banco.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={filtrosPagadas.busqueda}
                                onChange={(e) => setFiltrosPagadas({ ...filtrosPagadas, busqueda: e.target.value })}
                                placeholder="Factura, cliente..."
                                className="w-full pl-10 pr-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* NUEVO: Panel de filtros avanzados */}
                {mostrarFiltrosAvanzados && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Opciones Adicionales
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Filtro por método de pago */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Método de Pago
                                </label>
                                <select
                                    value={filtrosPagadas.metodo_pago}
                                    onChange={(e) => setFiltrosPagadas({ ...filtrosPagadas, metodo_pago: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">Todos los métodos</option>
                                    {metodosPago.map(metodo => (
                                        <option key={metodo.value} value={metodo.value}>{metodo.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Toggle para mostrar estadísticas */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setMostrarEstadisticas(!mostrarEstadisticas);
                                        if (!mostrarEstadisticas) {
                                            cargarEstadisticas();
                                        }
                                    }}
                                    className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                                        mostrarEstadisticas 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    {mostrarEstadisticas ? 'Ocultar Estadísticas' : 'Mostrar Estadísticas'}
                                </button>
                            </div>

                            {/* Botón limpiar filtros */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setFiltrosPagadas({
                                            banco: '',
                                            fecha_inicio: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
                                            fecha_fin: new Date().toISOString().split('T')[0],
                                            busqueda: '',
                                            metodo_pago: ''
                                        });
                                        setMostrarEstadisticas(false);
                                    }}
                                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NUEVO: Panel de Estadísticas Totales */}
                {mostrarEstadisticas && estadisticas && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Estadísticas Totales del Período
                        </h3>

                        {loadingEstadisticas ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-gray-600">Calculando estadísticas...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Resumen General */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Total Recaudado</p>
                                                <p className="text-2xl font-bold text-green-600">
                                                    ${(estadisticas.total_recaudado || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <Wallet className="w-10 h-10 text-green-500 opacity-20" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Total Pagos</p>
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {estadisticas.total_pagos || 0}
                                                </p>
                                            </div>
                                            <FileText className="w-10 h-10 text-blue-500 opacity-20" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Promedio por Pago</p>
                                                <p className="text-2xl font-bold text-purple-600">
                                                    ${(estadisticas.promedio_pago || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <DollarSign className="w-10 h-10 text-purple-500 opacity-20" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-600">Facturas Pagadas</p>
                                                <p className="text-2xl font-bold text-orange-600">
                                                    {estadisticas.facturas_pagadas || 0}
                                                </p>
                                            </div>
                                            <Check className="w-10 h-10 text-orange-500 opacity-20" />
                                        </div>
                                    </div>
                                </div>

                                {/* Desglose por Método de Pago */}
                                {estadisticas.por_metodo_pago && estadisticas.por_metodo_pago.length > 0 && (
                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4" />
                                            Desglose por Método de Pago
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                            {estadisticas.por_metodo_pago.map((metodo, index) => (
                                                <div key={index} className="border border-gray-200 rounded p-3">
                                                    <p className="text-xs text-gray-600 capitalize">{metodo.metodo_pago || 'N/A'}</p>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        ${(metodo.total || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{metodo.cantidad} pagos</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Desglose por Banco */}
                                {estadisticas.por_banco && estadisticas.por_banco.length > 0 && (
                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            Desglose por Banco
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            {estadisticas.por_banco.map((banco, index) => (
                                                <div key={index} className="border border-gray-200 rounded p-3">
                                                    <p className="text-xs text-gray-600">{banco.banco_nombre || 'N/A'}</p>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        ${(banco.total || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{banco.cantidad} pagos</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tabla de pagos */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Pago</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banco</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loadingPagadas ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-2">Cargando...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : facturasPagadasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No hay pagos registrados en el período seleccionado
                                    </td>
                                </tr>
                            ) : (
                                facturasPagadasFiltradas.map((factura) => (
                                    <tr key={factura.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {factura.numero_factura}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="font-medium">{factura.nombre_cliente}</div>
                                            <div className="text-gray-500">{factura.identificacion_cliente}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {factura.fecha_pago ? new Date(factura.fecha_pago).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                            {factura.metodo_pago || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {factura.banco_nombre || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                            ${parseFloat(factura.total || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => abrirModalDetalle(factura)}
                                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Cruce de Pago */}
            {mostrarModalCruce && facturaSeleccionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Registrar Pago - {facturaSeleccionada?.numero_factura}</h2>
                            <button
                                onClick={() => setMostrarModalCruce(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-600">Cliente:</span>
                                        <p className="font-medium">{facturaSeleccionada?.nombre_cliente}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600">Total Factura:</span>
                                        <p className="font-medium">${parseFloat(facturaSeleccionada?.total || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monto Pagado *
                                    </label>
                                    <input
                                        type="number"
                                        value={datosPago.monto}
                                        onChange={(e) => setDatosPago({ ...datosPago, monto: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Pago *
                                    </label>
                                    <input
                                        type="date"
                                        value={datosPago.fecha_pago}
                                        onChange={(e) => setDatosPago({ ...datosPago, fecha_pago: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Método de Pago *
                                    </label>
                                    <select
                                        value={datosPago.metodo_pago}
                                        onChange={(e) => setDatosPago({ ...datosPago, metodo_pago: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    >
                                        {metodosPago.map(metodo => (
                                            <option key={metodo.value} value={metodo.value}>{metodo.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Banco
                                    </label>
                                    <select
                                        value={datosPago.banco_id}
                                        onChange={(e) => setDatosPago({ ...datosPago, banco_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="">Seleccionar banco</option>
                                        {bancos.map(banco => (
                                            <option key={banco.id} value={banco.id}>{banco.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Referencia/Comprobante
                                </label>
                                <input
                                    type="text"
                                    value={datosPago.referencia}
                                    onChange={(e) => setDatosPago({ ...datosPago, referencia: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="Número de referencia o comprobante"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Observaciones
                                </label>
                                <textarea
                                    value={datosPago.observaciones}
                                    onChange={(e) => setDatosPago({ ...datosPago, observaciones: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    rows="3"
                                    placeholder="Observaciones adicionales..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    onClick={() => setMostrarModalCruce(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={cruzarPago}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Registrar Pago
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalle de Pago */}
            {mostrarModalDetalle && facturaSeleccionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-xl font-bold">Detalle del Pago - {facturaSeleccionada?.numero_factura}</h2>
                            <button
                                onClick={() => setMostrarModalDetalle(false)}
                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="space-y-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Información de la Factura</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm text-blue-700">Número de Factura:</span>
                                            <p className="font-medium text-blue-900">{facturaSeleccionada?.numero_factura}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-blue-700">Cliente:</span>
                                            <p className="font-medium text-blue-900">{facturaSeleccionada?.nombre_cliente || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-blue-700">Identificación:</span>
                                            <p className="font-medium text-blue-900">{facturaSeleccionada?.identificacion_cliente || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-blue-700">Fecha Emisión:</span>
                                            <p className="font-medium text-blue-900">
                                                {new Date(facturaSeleccionada?.fecha_emision).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-blue-700">Total Factura:</span>
                                            <p className="font-bold text-lg text-blue-900">
                                                ${parseFloat(facturaSeleccionada?.total || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-blue-700">Estado:</span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                                                Pagada
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-green-900 mb-3">Detalles del Pago</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm text-green-700">Fecha de Pago:</span>
                                            <p className="font-medium text-green-900">
                                                {facturaSeleccionada?.fecha_pago 
                                                    ? new Date(facturaSeleccionada.fecha_pago).toLocaleDateString()
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-green-700">Método de Pago:</span>
                                            <p className="font-medium text-green-900 capitalize">
                                                {facturaSeleccionada?.metodo_pago || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-green-700">Banco:</span>
                                            <p className="font-medium text-green-900">
                                                {facturaSeleccionada?.banco_nombre || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-green-700">Referencia:</span>
                                            <p className="font-medium text-green-900">
                                                {facturaSeleccionada?.referencia_pago || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-sm text-green-700">Valor Pagado:</span>
                                            <p className="font-bold text-xl text-green-900">
                                                ${parseFloat(facturaSeleccionada?.valor_pagado || facturaSeleccionada?.total || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {facturaSeleccionada?.observaciones && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Observaciones</h3>
                                        <p className="text-gray-700">{facturaSeleccionada.observaciones}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-6 border-t border-gray-200 flex-shrink-0">
                            <button
                                onClick={() => setMostrarModalDetalle(false)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrucePagosBancarios;
