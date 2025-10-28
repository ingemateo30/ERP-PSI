cat > ~/ERP-PSI/frontend/src/components/Facturas/CrucePagosBancarios.js << 'EOF'
// frontend/src/components/Facturas/CrucePagosBancarios.js
import React, { useState, useEffect } from 'react';
import {
    DollarSign, Calendar, Search, Filter, Download, 
    Check, X, Building, FileText, CreditCard, AlertCircle
} from 'lucide-react';

const CrucePagosBancarios = () => {
    const [facturasPendientes, setFacturasPendientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtros, setFiltros] = useState({
        banco: '',
        fecha_inicio: new Date(new Date().setDate(1)).toISOString().split('T')[0], // Primer día del mes
        fecha_fin: new Date().toISOString().split('T')[0],
        busqueda: ''
    });
    const [mostrarModalCruce, setMostrarModalCruce] = useState(false);
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

    const cargarFacturasPendientes = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                estado: 'pendiente',
                fecha_inicio: filtros.fecha_inicio,
                fecha_fin: filtros.fecha_fin,
                ...(filtros.busqueda && { search: filtros.busqueda })
            });

            const response = await fetch(`http://45.173.69.5:3000/api/v1/facturacion/facturas?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                setFacturasPendientes(data.data || []);
            }
        } catch (error) {
            console.error('Error cargando facturas:', error);
        } finally {
            setLoading(false);
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

    const cruzarPago = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://45.173.69.5:3000/api/v1/facturacion/facturas/${facturaSeleccionada.id}/pagar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    valor_pagado: parseFloat(datosPago.monto),
                    metodo_pago: datosPago.metodo_pago,
                    referencia_pago: datosPago.referencia,
                    fecha_pago: datosPago.fecha_pago,
                    observaciones: datosPago.observaciones,
                    banco_id: datosPago.banco_id
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Pago cruzado exitosamente');
                setMostrarModalCruce(false);
                cargarFacturasPendientes();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error cruzando pago:', error);
            alert('Error al cruzar el pago');
        }
    };

    const exportarPorBanco = async (bancoId) => {
        try {
            const banco = bancos.find(b => b.id === bancoId);
            const facturasFiltradas = facturasPendientes.filter(f => 
                filtros.banco ? f.banco_id === bancoId : true
            );

            // Crear CSV según el formato del banco
            let csvContent = '';
            const headers = ['Numero Factura', 'Cliente', 'Identificacion', 'Valor', 'Fecha Vencimiento'];
            
            csvContent = headers.join(',') + '\n';
            facturasFiltradas.forEach(factura => {
                const row = [
                    factura.numero_factura,
                    `"${factura.cliente_nombre}"`,
                    factura.cliente_identificacion,
                    factura.total,
                    factura.fecha_vencimiento
                ].join(',');
                csvContent += row + '\n';
            });

            // Descargar CSV
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

    const facturasFiltradas = facturasPendientes.filter(f => {
        if (filtros.banco && f.banco_id !== parseInt(filtros.banco)) return false;
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

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={filtros.fecha_inicio}
                            onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
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
                            onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Banco
                        </label>
                        <select
                            value={filtros.banco}
                            onChange={(e) => setFiltros({...filtros, banco: e.target.value})}
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
                                onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                                className="w-full pl-10 pr-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de facturas */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Factura
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Cliente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Vencimiento
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : facturasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        No hay facturas pendientes
                                    </td>
                                </tr>
                            ) : (
                                facturasFiltradas.map(factura => (
                                    <tr key={factura.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {factura.numero_factura}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{factura.cliente_nombre}</div>
                                            <div className="text-sm text-gray-500">{factura.cliente_identificacion}</div>
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

            {/* Modal de Cruce de Pago */}
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
                                        onChange={(e) => setDatosPago({...datosPago, monto: e.target.value})}
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
                                        onChange={(e) => setDatosPago({...datosPago, fecha_pago: e.target.value})}
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
                                        onChange={(e) => setDatosPago({...datosPago, banco_id: e.target.value})}
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
                                        onChange={(e) => setDatosPago({...datosPago, metodo_pago: e.target.value})}
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
                                    onChange={(e) => setDatosPago({...datosPago, referencia: e.target.value})}
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
                                    onChange={(e) => setDatosPago({...datosPago, observaciones: e.target.value})}
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
        </div>
    );
};

export default CrucePagosBancarios;
EOF