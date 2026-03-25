// frontend/src/components/Facturas/CrucePagosBancarios.js
import React, { useState, useEffect, useMemo } from 'react';
import apiService from '../../services/apiService';
import {
    DollarSign, Calendar, Search, Download, Check, X,
    FileText, CreditCard, AlertCircle, Eye, History,
    RefreshCw, BarChart3, TrendingUp, Building, Clock,
    ChevronRight, ArrowUpRight, CheckCircle2, XCircle
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => Math.round(parseFloat(n) || 0).toLocaleString('es-CO');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '—';

const metodoBadge = {
    transferencia: 'bg-blue-100 text-blue-800',
    efectivo:      'bg-green-100 text-green-800',
    consignacion:  'bg-purple-100 text-purple-800',
    cheque:        'bg-yellow-100 text-yellow-800',
};

const METODOS = ['transferencia', 'efectivo', 'consignacion', 'cheque'];

// ─── KPI card ────────────────────────────────────────────────────────────────

const KpiCard = ({ icon: Icon, label, value, sub, color }) => (
    <div className={`rounded-xl p-4 flex items-center gap-4 shadow-sm border ${color}`}>
        <div className="p-2 rounded-lg bg-white bg-opacity-50">
            <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium opacity-75 truncate">{label}</p>
            <p className="text-xl font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs opacity-60 truncate">{sub}</p>}
        </div>
    </div>
);

// ─── main component ──────────────────────────────────────────────────────────

const CrucePagosBancarios = () => {
    const [tab, setTab]                           = useState('pendientes');
    const [facturasPendientes, setFacturasPendientes] = useState([]);
    const [facturasPagadas, setFacturasPagadas]   = useState([]);
    const [bancos, setBancos]                     = useState([]);
    const [loading, setLoading]                   = useState(false);
    const [loadingPagadas, setLoadingPagadas]     = useState(false);

    const [filtrosPendientes, setFiltrosPendientes] = useState({
        fecha_inicio: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        fecha_fin:    new Date().toISOString().split('T')[0],
        busqueda:     ''
    });

    const [filtrosPagadas, setFiltrosPagadas] = useState({
        banco:        '',
        metodo_pago:  '',
        fecha_inicio: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        fecha_fin:    new Date().toISOString().split('T')[0],
        busqueda:     ''
    });

    const [modalCruce, setModalCruce]     = useState(false);
    const [modalDetalle, setModalDetalle] = useState(false);
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
    const [datosPago, setDatosPago] = useState({
        monto: '', referencia: '',
        fecha_pago:   new Date().toISOString().split('T')[0],
        banco_id:     '',
        metodo_pago:  'transferencia',
        observaciones: ''
    });
    const [guardando, setGuardando] = useState(false);

    // ── load on mount ──
    useEffect(() => {
        cargarBancos();
        cargarPendientes();
        cargarPagadas();
    }, []); // eslint-disable-line

    // ── data loading ──
    const cargarBancos = async () => {
        try {
            const r = await apiService.get('/config/banks?activo=true');
            if (r?.success) setBancos(r.data || []);
        } catch (e) { console.error(e); }
    };

    const cargarPendientes = async () => {
        try {
            setLoading(true);
            const p = new URLSearchParams({
                estado:       'pendiente',
                fecha_inicio: filtrosPendientes.fecha_inicio,
                fecha_fin:    filtrosPendientes.fecha_fin,
            });
            if (filtrosPendientes.busqueda) p.append('search', filtrosPendientes.busqueda);
            const r = await apiService.get(`/facturacion/facturas?${p}`);
            if (r?.success) {
                const data = Array.isArray(r.data) ? r.data : (r.data?.facturas || []);
                setFacturasPendientes(data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const cargarPagadas = async () => {
        try {
            setLoadingPagadas(true);
            const p = new URLSearchParams({
                estado:           'pagada',
                fecha_pago_inicio: filtrosPagadas.fecha_inicio,
                fecha_pago_fin:   filtrosPagadas.fecha_fin,
            });
            if (filtrosPagadas.busqueda)   p.append('search',     filtrosPagadas.busqueda);
            if (filtrosPagadas.banco)      p.append('banco_id',   filtrosPagadas.banco);
            if (filtrosPagadas.metodo_pago) p.append('metodo_pago', filtrosPagadas.metodo_pago);
            const r = await apiService.get(`/facturacion/facturas?${p}`);
            if (r?.success) {
                const data = Array.isArray(r.data) ? r.data : (r.data?.facturas || []);
                setFacturasPagadas(data);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingPagadas(false); }
    };

    // ── derived stats ──
    const statsPendientes = useMemo(() => ({
        cantidad: facturasPendientes.length,
        total:    facturasPendientes.reduce((s, f) => s + parseFloat(f.total || 0), 0),
        vencidas: facturasPendientes.filter(f => new Date(f.fecha_vencimiento) < new Date()).length,
    }), [facturasPendientes]);

    const statsPagadas = useMemo(() => {
        const por_metodo = {};
        let total = 0;
        facturasPagadas.forEach(f => {
            total += parseFloat(f.total || 0);
            const m = f.metodo_pago || 'otro';
            if (!por_metodo[m]) por_metodo[m] = { cantidad: 0, monto: 0 };
            por_metodo[m].cantidad++;
            por_metodo[m].monto += parseFloat(f.total || 0);
        });
        return { cantidad: facturasPagadas.length, total, por_metodo };
    }, [facturasPagadas]);

    // ── payment modal helpers ──
    const abrirCruce = (f) => {
        setFacturaSeleccionada(f);
        setDatosPago({
            monto:         Math.round(f.total),
            referencia:    '',
            fecha_pago:    new Date().toISOString().split('T')[0],
            banco_id:      '',
            metodo_pago:   'transferencia',
            observaciones: ''
        });
        setModalCruce(true);
    };

    const cruzarPago = async () => {
        try {
            setGuardando(true);
            const r = await apiService.post(`/facturacion/facturas/${facturaSeleccionada.id}/pagar`, {
                valor_pagado:    parseFloat(datosPago.monto),
                metodo_pago:     datosPago.metodo_pago,
                referencia_pago: datosPago.referencia,
                fecha_pago:      datosPago.fecha_pago,
                observaciones:   datosPago.observaciones,
                banco_id:        parseInt(datosPago.banco_id),
            });
            if (r?.success) {
                setModalCruce(false);
                cargarPendientes();
                cargarPagadas();
            } else {
                alert('Error: ' + (r?.message || 'Error desconocido'));
            }
        } catch (e) { alert('Error al cruzar el pago'); }
        finally { setGuardando(false); }
    };

    const exportarCSV = () => {
        const lista = tab === 'pendientes' ? facturasPendientes : facturasPagadas;
        let csv = '\ufeff';
        csv += 'Numero Factura,Cliente,Identificacion,Valor,Fecha Vencimiento\n';
        lista.forEach(f => {
            csv += `${f.numero_factura},"${f.nombre_cliente}",${f.identificacion_cliente},${f.total},${f.fecha_vencimiento}\n`;
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `pagos_${tab}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // ── overdue helper ──
    const diasVencida = (fecha) => {
        const d = Math.floor((new Date() - new Date(fecha)) / 86400000);
        return d > 0 ? d : 0;
    };

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cruce de Pagos Bancarios</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Registra y consulta los pagos de facturas</p>
                </div>
                <button
                    onClick={exportarCSV}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-4 h-4" /> Exportar CSV
                </button>
            </div>

            {/* ── KPI strip ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    icon={AlertCircle}
                    label="Facturas Pendientes"
                    value={statsPendientes.cantidad}
                    sub={`${statsPendientes.vencidas} vencidas`}
                    color="bg-orange-50 border-orange-200 text-orange-800"
                />
                <KpiCard
                    icon={DollarSign}
                    label="Monto Pendiente"
                    value={`$${fmt(statsPendientes.total)}`}
                    color="bg-red-50 border-red-200 text-red-800"
                />
                <KpiCard
                    icon={CheckCircle2}
                    label="Pagos Registrados"
                    value={statsPagadas.cantidad}
                    sub={`período seleccionado`}
                    color="bg-green-50 border-green-200 text-green-800"
                />
                <KpiCard
                    icon={TrendingUp}
                    label="Monto Recaudado"
                    value={`$${fmt(statsPagadas.total)}`}
                    color="bg-blue-50 border-blue-200 text-blue-800"
                />
            </div>

            {/* ── Tabs ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {[
                        { id: 'pendientes', label: 'Pendientes de Pago', icon: AlertCircle, count: statsPendientes.cantidad },
                        { id: 'pagadas',    label: 'Historial de Pagos',  icon: History,     count: statsPagadas.cantidad },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                tab === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                            }`}>{t.count}</span>
                        </button>
                    ))}
                </div>

                {/* ── Tab: Pendientes ── */}
                {tab === 'pendientes' && (
                    <div>
                        {/* filters */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex flex-wrap gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                                    <input type="date" value={filtrosPendientes.fecha_inicio}
                                        onChange={e => setFiltrosPendientes(p => ({...p, fecha_inicio: e.target.value}))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                                    <input type="date" value={filtrosPendientes.fecha_fin}
                                        onChange={e => setFiltrosPendientes(p => ({...p, fecha_fin: e.target.value}))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input type="text" placeholder="Factura o cliente..."
                                            value={filtrosPendientes.busqueda}
                                            onChange={e => setFiltrosPendientes(p => ({...p, busqueda: e.target.value}))}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <button onClick={cargarPendientes} disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Buscar
                                </button>
                            </div>
                        </div>

                        {/* table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        {['Factura','Cliente','Emisión','Vencimiento','Total','Estado','Acción'].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando…
                                        </td></tr>
                                    ) : facturasPendientes.length === 0 ? (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />No hay facturas pendientes
                                        </td></tr>
                                    ) : facturasPendientes.map(f => {
                                        const dias = diasVencida(f.fecha_vencimiento);
                                        const vencida = dias > 0;
                                        return (
                                            <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3 font-medium text-gray-900">{f.numero_factura}</td>
                                                <td className="px-5 py-3">
                                                    <p className="font-medium text-gray-900">{f.nombre_cliente}</p>
                                                    <p className="text-xs text-gray-400">{f.identificacion_cliente}</p>
                                                </td>
                                                <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmtDate(f.fecha_emision)}</td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className={vencida ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                                        {fmtDate(f.fecha_vencimiento)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-gray-900 whitespace-nowrap">${fmt(f.total)}</td>
                                                <td className="px-5 py-3">
                                                    {vencida ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                            <Clock className="w-3 h-3" />{dias}d vencida
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                                            <AlertCircle className="w-3 h-3" />Pendiente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <button onClick={() => abrirCruce(f)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                                                        <CreditCard className="w-3.5 h-3.5" />Cruzar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Tab: Pagadas ── */}
                {tab === 'pagadas' && (
                    <div>
                        {/* filters */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex flex-wrap gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                                    <input type="date" value={filtrosPagadas.fecha_inicio}
                                        onChange={e => setFiltrosPagadas(p => ({...p, fecha_inicio: e.target.value}))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                                    <input type="date" value={filtrosPagadas.fecha_fin}
                                        onChange={e => setFiltrosPagadas(p => ({...p, fecha_fin: e.target.value}))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1"><Building className="w-3.5 h-3.5 inline mr-1" />Banco</label>
                                    <select value={filtrosPagadas.banco}
                                        onChange={e => setFiltrosPagadas(p => ({...p, banco: e.target.value}))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Todos los bancos</option>
                                        {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1"><CreditCard className="w-3.5 h-3.5 inline mr-1" />Método</label>
                                    <select value={filtrosPagadas.metodo_pago}
                                        onChange={e => setFiltrosPagadas(p => ({...p, metodo_pago: e.target.value}))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Todos</option>
                                        {METODOS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1 min-w-[160px]">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input type="text" placeholder="Factura o cliente..."
                                            value={filtrosPagadas.busqueda}
                                            onChange={e => setFiltrosPagadas(p => ({...p, busqueda: e.target.value}))}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <button onClick={cargarPagadas} disabled={loadingPagadas}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                    {loadingPagadas ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Buscar
                                </button>
                            </div>
                        </div>

                        {/* inline stats: breakdown by method */}
                        {facturasPagadas.length > 0 && (
                            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <BarChart3 className="w-3.5 h-3.5" />Desglose por método de pago
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(statsPagadas.por_metodo).map(([m, d]) => (
                                        <div key={m} className="bg-white rounded-lg px-4 py-2.5 shadow-sm flex items-center gap-3 border border-white">
                                            <div>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${metodoBadge[m] || 'bg-gray-100 text-gray-700'}`}>{m}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900 leading-tight">{d.cantidad}</p>
                                                <p className="text-xs text-gray-500">${fmt(d.monto)}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-white rounded-lg px-4 py-2.5 shadow-sm flex items-center gap-3 border border-indigo-100">
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Total</span>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-indigo-700 leading-tight">{statsPagadas.cantidad}</p>
                                            <p className="text-xs text-indigo-500">${fmt(statsPagadas.total)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        {['Factura','Cliente','Fecha Pago','Método','Banco','Total','Detalle'].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingPagadas ? (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando…
                                        </td></tr>
                                    ) : facturasPagadas.length === 0 ? (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />No hay pagos en el período seleccionado
                                        </td></tr>
                                    ) : facturasPagadas.map(f => (
                                        <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 font-medium text-gray-900">{f.numero_factura}</td>
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-gray-900">{f.nombre_cliente}</p>
                                                <p className="text-xs text-gray-400">{f.identificacion_cliente}</p>
                                            </td>
                                            <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmtDate(f.fecha_pago)}</td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${metodoBadge[f.metodo_pago] || 'bg-gray-100 text-gray-700'}`}>
                                                    {f.metodo_pago || '—'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">{bancos.find(b => b.id === f.banco_id)?.nombre || '—'}</td>
                                            <td className="px-5 py-3 font-semibold text-green-700 whitespace-nowrap">${fmt(f.total)}</td>
                                            <td className="px-5 py-3">
                                                <button onClick={() => { setFacturaSeleccionada(f); setModalDetalle(true); }}
                                                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-medium transition-colors">
                                                    <Eye className="w-3.5 h-3.5" />Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal: Cruzar Pago ── */}
            {modalCruce && facturaSeleccionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-600" />Registrar Pago
                            </h2>
                            <button onClick={() => setModalCruce(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            {/* invoice summary */}
                            <div className="bg-indigo-50 rounded-lg px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-indigo-600 font-medium">{facturaSeleccionada.numero_factura}</p>
                                    <p className="font-semibold text-gray-900">{facturaSeleccionada.nombre_cliente}</p>
                                </div>
                                <p className="text-xl font-bold text-indigo-700">${fmt(facturaSeleccionada.total)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Monto</label>
                                    <input type="number" step="1" value={datosPago.monto}
                                        onChange={e => setDatosPago(p => ({...p, monto: Math.round(Number(e.target.value))}))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Pago</label>
                                    <input type="date" value={datosPago.fecha_pago}
                                        onChange={e => setDatosPago(p => ({...p, fecha_pago: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
                                    <select value={datosPago.banco_id}
                                        onChange={e => setDatosPago(p => ({...p, banco_id: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Seleccionar banco</option>
                                        {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Método</label>
                                    <select value={datosPago.metodo_pago}
                                        onChange={e => setDatosPago(p => ({...p, metodo_pago: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                        {METODOS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Referencia</label>
                                <input type="text" value={datosPago.referencia}
                                    onChange={e => setDatosPago(p => ({...p, referencia: e.target.value}))}
                                    placeholder="Número de referencia o comprobante"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                                <textarea rows={2} value={datosPago.observaciones}
                                    onChange={e => setDatosPago(p => ({...p, observaciones: e.target.value}))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                            <button onClick={() => setModalCruce(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={cruzarPago} disabled={guardando}
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Detalle Pago ── */}
            {modalDetalle && facturaSeleccionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-green-600" />Detalle del Pago
                            </h2>
                            <button onClick={() => setModalDetalle(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Factura</p>
                                <p className="font-bold text-gray-900 text-lg">{facturaSeleccionada.numero_factura}</p>
                                <p className="text-gray-700">{facturaSeleccionada.nombre_cliente}</p>
                                <p className="text-xs text-gray-500">{facturaSeleccionada.identificacion_cliente}</p>
                            </div>

                            <div className="bg-green-50 rounded-lg p-4 space-y-2">
                                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Información del Pago</p>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-gray-500">Fecha:</span>
                                    <span className="font-medium text-gray-900">{fmtDate(facturaSeleccionada.fecha_pago)}</span>
                                    <span className="text-gray-500">Método:</span>
                                    <span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${metodoBadge[facturaSeleccionada.metodo_pago] || 'bg-gray-100 text-gray-700'}`}>
                                            {facturaSeleccionada.metodo_pago || '—'}
                                        </span>
                                    </span>
                                    <span className="text-gray-500">Banco:</span>
                                    <span className="font-medium text-gray-900">{bancos.find(b => b.id === facturaSeleccionada.banco_id)?.nombre || '—'}</span>
                                    <span className="text-gray-500">Referencia:</span>
                                    <span className="font-medium text-gray-900">{facturaSeleccionada.referencia_pago || '—'}</span>
                                    <span className="text-gray-500">Total:</span>
                                    <span className="font-bold text-green-700 text-base">${fmt(facturaSeleccionada.total)}</span>
                                </div>
                            </div>

                            {facturaSeleccionada.observaciones && (
                                <div className="bg-yellow-50 rounded-lg px-4 py-3">
                                    <p className="text-xs text-yellow-700 font-medium uppercase tracking-wide mb-1">Observaciones</p>
                                    <p className="text-sm text-gray-700">{facturaSeleccionada.observaciones}</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                            <button onClick={() => setModalDetalle(false)}
                                className="w-full py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
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
