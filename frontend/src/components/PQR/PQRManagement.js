// components/PQR/PQRManagement.js
import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, MessageCircle, AlertTriangle, 
    CheckCircle, Clock, Eye, Edit, Trash2, FileText,
    Phone, Mail, User, Calendar
} from 'lucide-react';

const PQRManagement = () => {
    const [pqrs, setPqrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedPqr, setSelectedPqr] = useState(null);
    const [filters, setFilters] = useState({
        estado: '',
        tipo: '',
        fechaInicio: '',
        fechaFin: '',
        search: ''
    });
    const [stats, setStats] = useState({
        total: 0,
        abiertos: 0,
        enProceso: 0,
        resueltos: 0,
        cerrados: 0
    });

    const tiposPQR = [
        { value: 'peticion', label: 'Petición', color: 'blue' },
        { value: 'queja', label: 'Queja', color: 'red' },
        { value: 'reclamo', label: 'Reclamo', color: 'orange' },
        { value: 'sugerencia', label: 'Sugerencia', color: 'green' }
    ];

    const estadosPQR = [
        { value: 'abierto', label: 'Abierto', color: 'gray', icon: Clock },
        { value: 'en_proceso', label: 'En Proceso', color: 'yellow', icon: AlertTriangle },
        { value: 'resuelto', label: 'Resuelto', color: 'green', icon: CheckCircle },
        { value: 'cerrado', label: 'Cerrado', color: 'blue', icon: CheckCircle }
    ];

    const categorias = [
        'facturacion',
        'tecnico',
        'comercial',
        'atencion_cliente',
        'otros'
    ];

    const mediosRecepcion = [
        'telefono',
        'email',
        'presencial',
        'web',
        'chat'
    ];

    useEffect(() => {
        cargarPQRs();
        cargarEstadisticas();
    }, [filters]);

    const cargarPQRs = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/pqr?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setPqrs(data.pqrs || []);
        } catch (error) {
            console.error('Error cargando PQRs:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarEstadisticas = async () => {
        try {
            const response = await fetch('/api/pqr/estadisticas', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const getEstadoColor = (estado) => {
        const estadoData = estadosPQR.find(e => e.value === estado);
        return estadoData ? estadoData.color : 'gray';
    };

    const getTipoColor = (tipo) => {
        const tipoData = tiposPQR.find(t => t.value === tipo);
        return tipoData ? tipoData.color : 'gray';
    };

    const formatFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calcularTiempoTranscurrido = (fechaRecepcion) => {
        const ahora = new Date();
        const fecha = new Date(fechaRecepcion);
        const diffMs = ahora - fecha;
        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDias = Math.floor(diffHoras / 24);
        
        if (diffDias > 0) {
            return `${diffDias} día${diffDias > 1 ? 's' : ''}`;
        } else if (diffHoras > 0) {
            return `${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
        } else {
            return 'Menos de 1 hora';
        }
    };

    const abrirModal = (pqr = null) => {
        setSelectedPqr(pqr);
        setShowModal(true);
    };

    const cerrarModal = () => {
        setSelectedPqr(null);
        setShowModal(false);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Gestión de PQR
                        </h1>
                        <p className="text-gray-600">
                            Peticiones, Quejas y Reclamos
                        </p>
                    </div>
                    <button
                        onClick={() => abrirModal()}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva PQR
                    </button>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                        <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-gray-500">{stats.abiertos}</div>
                        <div className="text-sm text-gray-600">Abiertos</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-yellow-600">{stats.enProceso}</div>
                        <div className="text-sm text-gray-600">En Proceso</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-green-600">{stats.resueltos}</div>
                        <div className="text-sm text-gray-600">Resueltos</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-blue-600">{stats.cerrados}</div>
                        <div className="text-sm text-gray-600">Cerrados</div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar
                        </label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Radicado, cliente..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                        </label>
                        <select
                            value={filters.estado}
                            onChange={(e) => handleFilterChange('estado', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos los estados</option>
                            {estadosPQR.map(estado => (
                                <option key={estado.value} value={estado.value}>
                                    {estado.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo
                        </label>
                        <select
                            value={filters.tipo}
                            onChange={(e) => handleFilterChange('tipo', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos los tipos</option>
                            {tiposPQR.map(tipo => (
                                <option key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={filters.fechaInicio}
                            onChange={(e) => handleFilterChange('fechaInicio', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={filters.fechaFin}
                            onChange={(e) => handleFilterChange('fechaFin', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Lista de PQRs */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Lista de PQR ({pqrs.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : pqrs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Radicado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Asunto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tiempo
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pqrs.map((pqr) => (
                                    <tr key={pqr.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {pqr.numero_radicado}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {pqr.cliente_nombre}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {pqr.cliente_identificacion}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getTipoColor(pqr.tipo)}-100 text-${getTipoColor(pqr.tipo)}-800`}>
                                                {tiposPQR.find(t => t.value === pqr.tipo)?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {pqr.asunto}
                                            </div>
                                            <div className="text-sm text-gray-500 capitalize">
                                                {pqr.categoria.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getEstadoColor(pqr.estado)}-100 text-${getEstadoColor(pqr.estado)}-800`}>
                                                {estadosPQR.find(e => e.value === pqr.estado)?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatFecha(pqr.fecha_recepcion)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {calcularTiempoTranscurrido(pqr.fecha_recepcion)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex space-x-2 justify-end">
                                                <button
                                                    onClick={() => abrirModal(pqr)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => abrirModal(pqr)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay PQR registradas
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Comienza registrando la primera PQR
                        </p>
                        <button
                            onClick={() => abrirModal()}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva PQR
                        </button>
                    </div>
                )}
            </div>

            {/* Modal para crear/editar PQR */}
            {showModal && (
                <PQRModal
                    pqr={selectedPqr}
                    onClose={cerrarModal}
                    onSave={() => {
                        cargarPQRs();
                        cargarEstadisticas();
                        cerrarModal();
                    }}
                />
            )}
        </div>
    );
};

// Componente Modal para PQR
const PQRModal = ({ pqr, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        cliente_id: '',
        tipo: 'peticion',
        categoria: 'atencion_cliente',
        medio_recepcion: 'telefono',
        asunto: '',
        descripcion: '',
        prioridad: 'media',
        servicio_afectado: 'internet'
    });
    const [loading, setLoading] = useState(false);
    const [clientes, setClientes] = useState([]);

    useEffect(() => {
        cargarClientes();
        if (pqr) {
            setFormData({
                cliente_id: pqr.cliente_id || '',
                tipo: pqr.tipo || 'peticion',
                categoria: pqr.categoria || 'atencion_cliente',
                medio_recepcion: pqr.medio_recepcion || 'telefono',
                asunto: pqr.asunto || '',
                descripcion: pqr.descripcion || '',
                prioridad: pqr.prioridad || 'media',
                servicio_afectado: pqr.servicio_afectado || 'internet',
                estado: pqr.estado || 'abierto',
                respuesta: pqr.respuesta || ''
            });
        }
    }, [pqr]);

    const cargarClientes = async () => {
        try {
            const response = await fetch('/api/clientes/activos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setClientes(data.clientes || []);
        } catch (error) {
            console.error('Error cargando clientes:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = pqr ? `/api/pqr/${pqr.id}` : '/api/pqr';
            const method = pqr ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                onSave();
            } else {
                throw new Error('Error guardando PQR');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error guardando la PQR');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {pqr ? 'Editar PQR' : 'Nueva PQR'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cliente */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cliente *
                            </label>
                            <select
                                value={formData.cliente_id}
                                onChange={(e) => handleChange('cliente_id', e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccionar cliente</option>
                                {clientes.map(cliente => (
                                    <option key={cliente.id} value={cliente.id}>
                                        {cliente.nombre} - {cliente.identificacion}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Tipo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo *
                            </label>
                            <select
                                value={formData.tipo}
                                onChange={(e) => handleChange('tipo', e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="peticion">Petición</option>
                                <option value="queja">Queja</option>
                                <option value="reclamo">Reclamo</option>
                                <option value="sugerencia">Sugerencia</option>
                            </select>
                        </div>

                        {/* Categoría */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Categoría *
                            </label>
                            <select
                                value={formData.categoria}
                                onChange={(e) => handleChange('categoria', e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="facturacion">Facturación</option>
                                <option value="tecnico">Técnico</option>
                                <option value="comercial">Comercial</option>
                                <option value="atencion_cliente">Atención al Cliente</option>
                                <option value="otros">Otros</option>
                            </select>
                        </div>

                        {/* Medio de Recepción */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Medio de Recepción *
                            </label>
                            <select
                                value={formData.medio_recepcion}
                                onChange={(e) => handleChange('medio_recepcion', e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="telefono">Teléfono</option>
                                <option value="email">Email</option>
                                <option value="presencial">Presencial</option>
                                <option value="web">Web</option>
                                <option value="chat">Chat</option>
                            </select>
                        </div>

                        {/* Prioridad */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prioridad
                            </label>
                            <select
                                value={formData.prioridad}
                                onChange={(e) => handleChange('prioridad', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="baja">Baja</option>
                                <option value="media">Media</option>
                                <option value="alta">Alta</option>
                                <option value="critica">Crítica</option>
                            </select>
                        </div>

                        {/* Servicio Afectado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Servicio Afectado
                            </label>
                            <select
                                value={formData.servicio_afectado}
                                onChange={(e) => handleChange('servicio_afectado', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="internet">Internet</option>
                                <option value="television">Televisión</option>
                                <option value="combo">Combo</option>
                                <option value="todos">Todos</option>
                            </select>
                        </div>

                        {/* Estado (solo para edición) */}
                        {pqr && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado
                                </label>
                                <select
                                    value={formData.estado}
                                    onChange={(e) => handleChange('estado', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="abierto">Abierto</option>
                                    <option value="en_proceso">En Proceso</option>
                                    <option value="resuelto">Resuelto</option>
                                    <option value="cerrado">Cerrado</option>
                                </select>
                            </div>
                        )}

                        {/* Asunto */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Asunto *
                            </label>
                            <input
                                type="text"
                                value={formData.asunto}
                                onChange={(e) => handleChange('asunto', e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Resumen del motivo de la PQR"
                            />
                        </div>

                        {/* Descripción */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción *
                            </label>
                            <textarea
                                value={formData.descripcion}
                                onChange={(e) => handleChange('descripcion', e.target.value)}
                                required
                                rows={4}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Describe detalladamente la situación..."
                            />
                        </div>

                        {/* Respuesta (solo para edición) */}
                        {pqr && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Respuesta
                                </label>
                                <textarea
                                    value={formData.respuesta || ''}
                                    onChange={(e) => handleChange('respuesta', e.target.value)}
                                    rows={4}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Respuesta o solución proporcionada..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : (pqr ? 'Actualizar' : 'Crear')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PQRManagement;