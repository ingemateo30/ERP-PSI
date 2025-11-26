// frontend/src/components/Facturas/CrucePagosBancarios.js - VERSIÓN FINAL CORREGIDA
import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import {
    DollarSign,
    Calendar,
    Search,
    Download,
    Check,
    X,
    FileText,
    CreditCard,
    AlertCircle,
    Eye,
    History,
    RefreshCw,
    BarChart3,
    TrendingUp,
    Building,
    PieChart
} from 'lucide-react';

const CrucePagosBancarios = () => {
    const [facturasPendientes, setFacturasPendientes] = useState([]);
    const [facturasPagadas, setFacturasPagadas] = useState([]);
    const [bancos, setBancos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingPagadas, setLoadingPagadas] = useState(false);
    const [loadingBancos, setLoadingBancos] = useState(false);
    
    // Estados para estadísticas
    const [estadisticas, setEstadisticas] = useState(null);
    const [loadingEstadisticas, setLoadingEstadisticas] = useState(false);
    const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
    const [busquedaRealizada, setBusquedaRealizada] = useState(false); // NUEVO

    // Filtros para pendientes (SIN BANCO)
    const [filtrosPendientes, setFiltrosPendientes] = useState({
        fecha_inicio: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        busqueda: ''
    });

    // Filtros para pagadas (CON BANCO Y MÉTODO DE PAGO)
    const [filtrosPagadas, setFiltrosPagadas] = useState({
        banco: '',
        metodo_pago: '',
        fecha_inicio: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        busqueda: ''
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

    useEffect(() => {
        cargarBancos();
cargarFacturasPendientes();
cargarFacturasPagadasInicial();
    }, []);

    const cargarBancos = async () => {
        try {
            setLoadingBancos(true);
            const response = await apiService.get('/config/banks?activo=true');
            if (response && response.success) {
                setBancos(response.data || []);
            }
        } catch (error) {
            console.error('Error cargando bancos:', error);
        } finally {
            setLoadingBancos(false);
        }
    };

    const cargarFacturasPendientes = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                estado: 'pendiente',
                fecha_inicio: filtrosPendientes.fecha_inicio,
                fecha_fin: filtrosPendientes.fecha_fin
            });

            if (filtrosPendientes.busqueda) {
                params.append('search', filtrosPendientes.busqueda);
            }

            const response = await apiService.get(`/facturacion/facturas?${params}`);
            
            if (response && response.success) {
                const facturas = Array.isArray(response.data) 
                    ? response.data 
                    : (response.data?.facturas || []);
                setFacturasPendientes(facturas);
            }
        } catch (error) {
            console.error('Error cargando facturas pendientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const buscarFacturasPagadas = async () => {
        try {
            setLoadingPagadas(true);
            setBusquedaRealizada(false);
            setMostrarEstadisticas(false);
            
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

            const response = await apiService.get(`/facturacion/facturas?${params}`);
            
            if (response && response.success) {
                const facturas = Array.isArray(response.data) 
                    ? response.data 
                    : (response.data?.facturas || []);
                setFacturasPagadas(facturas);
                setBusquedaRealizada(true); // Mostrar botón de estadísticas
            }
        } catch (error) {
            console.error('Error cargando facturas pagadas:', error);
        } finally {
            setLoadingPagadas(false);
        }
    };
const cargarFacturasPagadasInicial = async () => {
        try {
            setLoadingPagadas(true);
            
            const params = new URLSearchParams({
                estado: 'pagada',
                fecha_pago_inicio: filtrosPagadas.fecha_inicio,
                fecha_pago_fin: filtrosPagadas.fecha_fin
            });

            const response = await apiService.get(`/facturacion/facturas?${params}`);
            
            if (response && response.success) {
                const facturas = Array.isArray(response.data) 
                    ? response.data 
                    : (response.data?.facturas || []);
                setFacturasPagadas(facturas);
                // NO establecer busquedaRealizada = true aquí
            }
        } catch (error) {
            console.error('Error cargando facturas pagadas:', error);
        } finally {
            setLoadingPagadas(false);
        }
    };
    const generarEstadisticas = async () => {
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

            console.log('📊 Generando estadísticas con:', params.toString());
            const response = await apiService.get(`/estadisticas/pagos?${params}`);
            console.log('📊 Respuesta estadísticas:', response);
            
            if (response && response.success) {
                setEstadisticas(response.data);
                setMostrarEstadisticas(true);
            } else {
                alert('Error al generar estadísticas');
            }
        } catch (error) {
            console.error('Error generando estadísticas:', error);
            alert('Error al generar estadísticas');
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
                if (busquedaRealizada) {
                    buscarFacturasPagadas();
                    if (mostrarEstadisticas) {
                        generarEstadisticas();
                    }
                }
            } else {
                alert('Error: ' + (response?.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error cruzando pago:', error);
            alert('Error al cruzar el pago');
        }
    };

    const exportarPorBanco = (bancoId) => {
        try {
            const banco = bancos.find(b => b.id === bancoId);
            let csvContent = '\ufeff';
            csvContent += 'Numero Factura,Cliente,Identificacion,Valor,Fecha Vencimiento\n';
            
            facturasPendientes.forEach(factura => {
                csvContent += `${factura.numero_factura},"${factura.nombre_cliente}",${factura.identificacion_cliente},${factura.total},${factura.fecha_vencimiento}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `facturas_${banco?.codigo || 'todas'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) {
            console.error('Error exportando:', error);
            alert('Error al exportar');
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cruce de Pagos Bancarios</h1>
                    <p className="text-gray-600">Registrar pagos de facturas pendientes</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportarPorBanco(5)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />Exportar Comultrasan
                    </button>
                    <button onClick={() => exportarPorBanco(6)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />Exportar Finecoop
                    </button>
                    <button onClick={() => exportarPorBanco(7)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-sm">
                        <Download className="w-4 h-4" />Exportar Caja Social
                    </button>
                </div>
            </div>

            {/* FACTURAS PENDIENTES */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-5 h-5" />
                    Facturas Pendientes de Pago
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                        <input type="date" value={filtrosPendientes.fecha_inicio} onChange={(e) => setFiltrosPendientes({...filtrosPendientes, fecha_inicio: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                        <input type="date" value={filtrosPendientes.fecha_fin} onChange={(e) => setFiltrosPendientes({...filtrosPendientes, fecha_fin: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                        <input type="text" placeholder="Factura, cliente..." value={filtrosPendientes.busqueda} onChange={(e) => setFiltrosPendientes({...filtrosPendientes, busqueda: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <button onClick={cargarFacturasPendientes} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm">
                        {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Buscando...</> : <><Search className="w-4 h-4" />Buscar</>}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">Cargando...</td></tr>
                            ) : facturasPendientes.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">No hay facturas pendientes</td></tr>
                            ) : (
                                facturasPendientes.map(factura => (
                                    <tr key={factura.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{factura.numero_factura}</td>
                                        <td className="px-6 py-4"><div className="text-sm text-gray-900">{factura.nombre_cliente}</div><div className="text-xs text-gray-500">{factura.identificacion_cliente}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(factura.fecha_emision).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(factura.fecha_vencimiento).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${parseFloat(factura.total).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><button onClick={() => abrirModalCruce(factura)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1 font-medium"><CreditCard className="w-4 h-4" />Cruzar Pago</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* HISTORIAL DE PAGOS */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-700">
                    <History className="w-5 h-5" />
                    Historial de Pagos Cruzados
                </h2>

                {/* FILTROS */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Filtros Avanzados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                            <input type="date" value={filtrosPagadas.fecha_inicio} onChange={(e) => setFiltrosPagadas({...filtrosPagadas, fecha_inicio: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                            <input type="date" value={filtrosPagadas.fecha_fin} onChange={(e) => setFiltrosPagadas({...filtrosPagadas, fecha_fin: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1"><Building className="w-4 h-4 inline mr-1" />Banco</label>
                            <select value={filtrosPagadas.banco} onChange={(e) => setFiltrosPagadas({...filtrosPagadas, banco: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Todos</option>
                                {bancos.map(banco => <option key={banco.id} value={banco.id}>{banco.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1"><CreditCard className="w-4 h-4 inline mr-1" />Método</label>
                            <select value={filtrosPagadas.metodo_pago} onChange={(e) => setFiltrosPagadas({...filtrosPagadas, metodo_pago: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">Todos</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="consignacion">Consignación</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                            <input type="text" placeholder="Factura..." value={filtrosPagadas.busqueda} onChange={(e) => setFiltrosPagadas({...filtrosPagadas, busqueda: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>

                {/* BOTONES */}
                <div className="flex justify-end gap-3 mb-4">
                    <button onClick={buscarFacturasPagadas} disabled={loadingPagadas} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm">
                        {loadingPagadas ? <><RefreshCw className="w-4 h-4 animate-spin" />Buscando...</> : <><Search className="w-4 h-4" />Buscar Pagos</>}
                    </button>
                    
                    {busquedaRealizada && (
                        <button onClick={generarEstadisticas} disabled={loadingEstadisticas} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-sm animate-pulse">
                            {loadingEstadisticas ? <><RefreshCw className="w-4 h-4 animate-spin" />Generando...</> : <><BarChart3 className="w-4 h-4" />Generar Estadísticas</>}
                        </button>
                    )}
                </div>

                {/* ESTADÍSTICAS */}
                {mostrarEstadisticas && estadisticas && (
                    <div className="mb-6 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div><p className="text-sm opacity-90">Total Pagos</p><p className="text-3xl font-bold mt-1">{estadisticas.total_pagos || 0}</p></div>
                                    <FileText className="w-10 h-10 opacity-80" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div><p className="text-sm opacity-90">Monto Total</p><p className="text-3xl font-bold mt-1">${(estadisticas.monto_total || 0).toLocaleString('es-CO')}</p></div>
                                    <DollarSign className="w-10 h-10 opacity-80" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div><p className="text-sm opacity-90">Promedio</p><p className="text-3xl font-bold mt-1">${Math.round(estadisticas.promedio_pago || 0).toLocaleString('es-CO')}</p></div>
                                    <TrendingUp className="w-10 h-10 opacity-80" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div><p className="text-sm opacity-90">En Tabla</p><p className="text-3xl font-bold mt-1">{facturasPagadas.length}</p></div>
                                    <PieChart className="w-10 h-10 opacity-80" />
                                </div>
                            </div>
                        </div>

                        {estadisticas.por_metodo && Object.keys(estadisticas.por_metodo).length > 0 && (
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Desglose por Método de Pago</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(estadisticas.por_metodo).map(([metodo, datos]) => (
                                        <div key={metodo} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                                            <p className="text-xs text-gray-600 uppercase font-semibold">{metodo}</p>
                                            <p className="text-2xl font-bold text-gray-900 my-1">{datos.cantidad || 0}</p>
                                            <p className="text-sm text-gray-600">${(datos.monto || 0).toLocaleString('es-CO')}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TABLA */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Pago</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banco</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loadingPagadas ? (
                                <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">Cargando...</td></tr>
                            ) : facturasPagadas.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">No hay pagos registrados</td></tr>
                            ) : (
                                facturasPagadas.map(factura => (
                                    <tr key={factura.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{factura.numero_factura}</td>
                                        <td className="px-6 py-4"><div className="text-sm text-gray-900">{factura.nombre_cliente}</div><div className="text-xs text-gray-500">{factura.identificacion_cliente}</div></td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{factura.fecha_pago ? new Date(factura.fecha_pago).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">{factura.metodo_pago || 'N/A'}</span></td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{bancos.find(b => b.id === factura.banco_id)?.nombre || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-green-600">${parseFloat(factura.total).toLocaleString()}</td>
                                        <td className="px-6 py-4"><button onClick={() => abrirModalDetalle(factura)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1"><Eye className="w-4 h-4" />Ver</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALES */}
            {mostrarModalCruce && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Cruzar Pago</h2>
                            <button onClick={() => setMostrarModalCruce(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded"><p><strong>Factura:</strong> {facturaSeleccionada?.numero_factura}</p><p><strong>Cliente:</strong> {facturaSeleccionada?.nombre_cliente}</p><p><strong>Total:</strong> ${parseFloat(facturaSeleccionada?.total || 0).toLocaleString()}</p></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">Monto</label><input type="number" value={datosPago.monto} onChange={(e) => setDatosPago({...datosPago, monto: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium mb-1">Fecha</label><input type="date" value={datosPago.fecha_pago} onChange={(e) => setDatosPago({...datosPago, fecha_pago: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">Banco</label><select value={datosPago.banco_id} onChange={(e) => setDatosPago({...datosPago, banco_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Seleccionar</option>{bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>
                                <div><label className="block text-sm font-medium mb-1">Método</label><select value={datosPago.metodo_pago} onChange={(e) => setDatosPago({...datosPago, metodo_pago: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="consignacion">Consignación</option><option value="cheque">Cheque</option></select></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Referencia</label><input type="text" value={datosPago.referencia} onChange={(e) => setDatosPago({...datosPago, referencia: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                            <div><label className="block text-sm font-medium mb-1">Observaciones</label><textarea value={datosPago.observaciones} onChange={(e) => setDatosPago({...datosPago, observaciones: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="3" /></div>
                            <div className="flex justify-end gap-2 pt-4"><button onClick={() => setMostrarModalCruce(false)} className="px-4 py-2 border rounded-lg">Cancelar</button><button onClick={cruzarPago} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Confirmar</button></div>
                        </div>
                    </div>
                </div>
            )}

            {mostrarModalDetalle && facturaSeleccionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Detalle del Pago</h2>
                            <button onClick={() => setMostrarModalDetalle(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded"><h3 className="font-semibold mb-2">Factura</h3><p><strong>Número:</strong> {facturaSeleccionada.numero_factura}</p><p><strong>Cliente:</strong> {facturaSeleccionada.nombre_cliente}</p><p><strong>Total:</strong> ${parseFloat(facturaSeleccionada.total).toLocaleString()}</p></div>
                            <div className="bg-green-50 p-4 rounded"><h3 className="font-semibold mb-2">Pago</h3><p><strong>Fecha:</strong> {facturaSeleccionada.fecha_pago ? new Date(facturaSeleccionada.fecha_pago).toLocaleDateString() : 'N/A'}</p><p><strong>Método:</strong> {facturaSeleccionada.metodo_pago || 'N/A'}</p><p><strong>Banco:</strong> {bancos.find(b => b.id === facturaSeleccionada.banco_id)?.nombre || 'N/A'}</p></div>
                            <button onClick={() => setMostrarModalDetalle(false)} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrucePagosBancarios;
