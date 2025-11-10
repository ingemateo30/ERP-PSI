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
    History
} from 'lucide-react';

const CrucePagosBancarios = () => {
    const [facturasPendientes, setFacturasPendientes] = useState([]);
    const [facturasPagadas, setFacturasPagadas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingPagadas, setLoadingPagadas] = useState(false);
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

    const bancos = [
        { id: 1, nombre: 'Bancolombia', codigo: 'BANCOLOMBIA' },
        { id: 2, nombre: 'Davivienda', codigo: 'DAVIVIENDA' },
        { id: 3, nombre: 'Banco de Bogotá', codigo: 'BOGOTA' },
        { id: 4, nombre: 'BBVA', codigo: 'BBVA' },
        { id: 5, nombre: 'Comultrasan', codigo: 'COMULTRASAN' },
        { id: 6, nombre: 'Finecoop', codigo: 'FINECOOP' },
        { id: 7, nombre: 'Caja Social', codigo: 'CAJA_SOCIAL' }
    ];

    useEffect(() => {
        cargarFacturasPendientes();
    }, [filtros]);

    useEffect(() => {
        cargarFacturasPagadas();
    }, [filtrosPagadas]);

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
        
        // Construir parámetros correctamente
        const params = new URLSearchParams({
            estado: 'pagada',
            fecha_inicio: filtrosPagadas.fecha_inicio,
            fecha_fin: filtrosPagadas.fecha_fin
        });

        // Agregar filtros opcionales si existen
        if (filtrosPagadas.busqueda) {
            params.append('search', filtrosPagadas.busqueda);
        }
        if (filtrosPagadas.banco) {
            params.append('banco_id', filtrosPagadas.banco);
        }

        // Hacer la petición al backend
        const response = await apiService.get(`/facturacion/facturas?${params.toString()}`);
        
        if (response && response.success) {
            // Extraer correctamente el array según la estructura del backend
            const facturas = Array.isArray(response.data) 
                ? response.data 
                : (response.data?.facturas || []);
            
            setFacturasPagadas(facturas);
        } else {
            setFacturasPagadas([]);
        }
    } catch (error) {
        console.error('Error cargando facturas pagadas:', error);
        setFacturasPagadas([]); // Asegurar que sea array vacío en caso de error
    } finally {
        setLoadingPagadas(false);
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
            banco_id: parseInt(datosPago.banco_id)  // ✅ Asegurar que sea número
        });

        if (response && response.success) {
            alert('Pago cruzado exitosamente');
            setMostrarModalCruce(false);
            cargarFacturasPendientes();
            cargarFacturasPagadas();
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

   

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cruce de Pagos Bancarios</h1>
                    <p className="text-gray-600">Registrar pagos de facturas pendientes</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportarPorBanco(5)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Exportar Comultrasan
                    </button>
                    <button
                        onClick={() => exportarPorBanco(6)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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

            {/* FACTURAS PENDIENTES */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
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
                            onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
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
                            onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
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
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Factura, cliente..."
                                value={filtros.busqueda}
                                onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
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
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Cargando...</td>
                                </tr>
                            ) : facturasPendientesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No hay facturas pendientes</td>
                                </tr>
                            ) : (
                                facturasPendientesFiltradas.map(factura => (
                                    <tr key={factura.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{factura.numero_factura}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{factura.nombre_cliente}</div>
                                            <div className="text-sm text-gray-500">{factura.identificacion_cliente}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(factura.fecha_emision).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(factura.fecha_vencimiento).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                ${parseFloat(factura.total).toLocaleString()}
                                            </div>
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
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-green-500" />
                    Historial de Pagos Cruzados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={filtrosPagadas.fecha_inicio}
                            onChange={(e) => setFiltrosPagadas({ ...filtrosPagadas, fecha_inicio: e.target.value })}
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
                            onChange={(e) => setFiltrosPagadas({ ...filtrosPagadas, fecha_fin: e.target.value })}
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
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Factura, cliente..."
                                value={filtrosPagadas.busqueda}
                                onChange={(e) => setFiltrosPagadas({ ...filtrosPagadas, busqueda: e.target.value })}
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
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Cargando...</td>
                                </tr>
                            ) : facturasPagadasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No hay pagos registrados</td>
                                </tr>
                            ) : (
                                facturasPagadasFiltradas.map(factura => (
                                    <tr key={factura.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{factura.numero_factura}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{factura.nombre_cliente}</div>
                                            <div className="text-sm text-gray-500">{factura.identificacion_cliente}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {factura.fecha_pago ? new Date(factura.fecha_pago).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {factura.metodo_pago || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {bancos.find(b => b.id === factura.banco_id)?.nombre || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-green-600">
                                                ${parseFloat(factura.total).toLocaleString()}
                                            </div>
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

            {/* Modal Cruzar Pago */}
            {mostrarModalCruce && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Cruzar Pago - {facturaSeleccionada?.numero_factura}</h2>
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
                                        <p className="font-medium">{facturaSeleccionada?.cliente_nombre}</p>
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
                                        Banco *
                                    </label>
                                    <select
                                        value={datosPago.banco_id}
                                        onChange={(e) => setDatosPago({ ...datosPago, banco_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    >
                                        <option value="">Seleccionar banco</option>
                                        {bancos.map(banco => (
                                            <option key={banco.id} value={banco.id}>{banco.nombre}</option>
                                        ))}
                                    </select>
                                </div>
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
                                        <option value="transferencia">Transferencia</option>
                                        <option value="consignacion">Consignación</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Referencia / Número de Transacción *
                                </label>
                                <input
                                    type="text"
                                    value={datosPago.referencia}
                                    onChange={(e) => setDatosPago({ ...datosPago, referencia: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="Ej: 123456789"
                                    required
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

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button
                                    onClick={() => setMostrarModalCruce(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={cruzarPago}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Confirmar Pago
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
                        {/* Header fijo */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-xl font-bold">Detalle del Pago - {facturaSeleccionada?.numero_factura}</h2>
                            <button
                                onClick={() => setMostrarModalDetalle(false)}
                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Contenido con scroll */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="space-y-6">
                                {/* Información de la Factura */}
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

                                {/* Información del Pago */}
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
                                                {facturaSeleccionada?.banco_nombre || bancos.find(b => b.id === facturaSeleccionada?.banco_id)?.nombre || 'N/A'}
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

                                {/* Observaciones */}
                                {facturaSeleccionada?.observaciones && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Observaciones</h3>
                                        <p className="text-gray-700">{facturaSeleccionada.observaciones}</p>
                                    </div>
                                )}

                                {/* Servicios de la Factura */}
                                {facturaSeleccionada?.servicios && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Servicios Incluidos</h3>
                                        <div className="space-y-2">
                                            {JSON.parse(facturaSeleccionada.servicios).map((servicio, index) => (
                                                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                                    <span className="text-gray-700">{servicio.descripcion || servicio.plan_nombre}</span>
                                                    <span className="font-medium text-gray-900">
                                                        ${parseFloat(servicio.valor || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer fijo */}
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