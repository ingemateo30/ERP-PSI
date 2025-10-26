// frontend/src/components/PQR/PQRManagement.js
import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, MessageCircle, AlertTriangle, 
    CheckCircle, Clock, Eye, Edit, Trash2, FileText,
    Phone, Mail, User, Calendar, X, Save, UserCheck,
    ExternalLink, History, Star, Download, RefreshCw
} from 'lucide-react';
import pqrService from '../../services/pqrService';

const PQRManagement = () => {
    const [pqrs, setPqrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPqr, setSelectedPqr] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        estado: '',
        tipo: '',
        categoria: '',
        fechaInicio: '',
        fechaFin: '',
        search: '',
        page: 1,
        limit: 50
    });
    const [stats, setStats] = useState({
        total: 0,
        abiertos: 0,
        en_proceso: 0,
        resueltos: 0,
        cerrados: 0,
        escalados: 0
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
        { value: 'cerrado', label: 'Cerrado', color: 'blue', icon: CheckCircle },
        { value: 'escalado', label: 'Escalado', color: 'red', icon: AlertTriangle }
    ];

    const categorias = [
        { value: 'facturacion', label: 'Facturación' },
        { value: 'tecnico', label: 'Técnico' },
        { value: 'comercial', label: 'Comercial' },
        { value: 'atencion_cliente', label: 'Atención al Cliente' },
        { value: 'otros', label: 'Otros' }
    ];

    const mediosRecepcion = [
        { value: 'telefono', label: 'Teléfono', icon: Phone },
        { value: 'email', label: 'Email', icon: Mail },
        { value: 'presencial', label: 'Presencial', icon: User },
        { value: 'web', label: 'Web', icon: ExternalLink },
        { value: 'chat', label: 'Chat', icon: MessageCircle },
        { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }
    ];

    const prioridades = [
        { value: 'baja', label: 'Baja', color: 'green' },
        { value: 'media', label: 'Media', color: 'yellow' },
        { value: 'alta', label: 'Alta', color: 'orange' },
        { value: 'critica', label: 'Crítica', color: 'red' }
    ];

    useEffect(() => {
        cargarPQRs();
        cargarEstadisticas();
    }, [filters]);

    const cargarPQRs = async () => {
        setLoading(true);
        try {
            const response = await pqrService.getPQRs({
                ...filters,
                page: currentPage
            });
            
            if (response.success) {
                setPqrs(response.pqrs || []);
                if (response.pagination) {
                    setTotalPages(response.pagination.total_pages);
                }
            }
        } catch (error) {
            console.error('Error cargando PQRs:', error);
            setPqrs([]);
        } finally {
            setLoading(false);
        }
    };

    const cargarEstadisticas = async () => {
        try {
            const response = await pqrService.getEstadisticas();
            if (response.success) {
                setStats(response.estadisticas || stats);
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1
        }));
        setCurrentPage(1);
    };

    const limpiarFiltros = () => {
        setFilters({
            estado: '',
            tipo: '',
            categoria: '',
            fechaInicio: '',
            fechaFin: '',
            search: '',
            page: 1,
            limit: 50
        });
        setCurrentPage(1);
    };

    const abrirModal = (pqr = null) => {
        setSelectedPqr(pqr);
        setShowModal(true);
    };

    const cerrarModal = () => {
        setShowModal(false);
        setSelectedPqr(null);
    };

    const abrirDetalle = (pqr) => {
        setSelectedPqr(pqr);
        setShowDetailModal(true);
    };

    const cerrarDetalle = () => {
        setShowDetailModal(false);
        setSelectedPqr(null);
    };

    const eliminarPQR = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta PQR?')) {
            return;
        }

        try {
            await pqrService.deletePQR(id);
            cargarPQRs();
            cargarEstadisticas();
        } catch (error) {
            alert('Error eliminando PQR: ' + error.message);
        }
    };

    const exportarDatos = () => {
        try {
            pqrService.exportarCSV(pqrs, `pqrs_${new Date().toISOString().split('T')[0]}.csv`);
        } catch (error) {
            alert('Error exportando datos: ' + error.message);
        }
    };

    const getEstadoBadge = (estado) => {
        const estadoConfig = estadosPQR.find(e => e.value === estado);
        if (!estadoConfig) return null;

        const colorClasses = {
            gray: 'bg-gray-100 text-gray-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            green: 'bg-green-100 text-green-800',
            blue: 'bg-blue-100 text-blue-800',
            red: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[estadoConfig.color]}`}>
                <estadoConfig.icon className="w-3 h-3 mr-1" />
                {estadoConfig.label}
            </span>
        );
    };

    const getTipoBadge = (tipo) => {
        const tipoConfig = tiposPQR.find(t => t.value === tipo);
        if (!tipoConfig) return null;

        const colorClasses = {
            blue: 'bg-blue-100 text-blue-800',
            red: 'bg-red-100 text-red-800',
            orange: 'bg-orange-100 text-orange-800',
            green: 'bg-green-100 text-green-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[tipoConfig.color]}`}>
                {tipoConfig.label}
            </span>
        );
    };

    const getPrioridadBadge = (prioridad) => {
        const prioridadConfig = prioridades.find(p => p.value === prioridad);
        if (!prioridadConfig) return null;

        const colorClasses = {
            green: 'bg-green-100 text-green-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            orange: 'bg-orange-100 text-orange-800',
            red: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[prioridadConfig.color]}`}>
                {prioridadConfig.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de PQR</h1>
                    <p className="text-gray-600">Peticiones, Quejas y Reclamos</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={exportarDatos}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        disabled={pqrs.length === 0}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </button>
                    <button
                        onClick={() => abrirModal()}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva PQR
                    </button>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-gray-600">{stats.abiertos}</div>
                    <div className="text-sm text-gray-600">Abiertos</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-yellow-600">{stats.en_proceso}</div>
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
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-red-600">{stats.escalados}</div>
                    <div className="text-sm text-gray-600">Escalados</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                
                <div className="flex justify-end mt-4">
                    <button
                        onClick={limpiarFiltros}
                        className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Lista de PQRs */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Lista de PQR ({pqrs.length})
                    </h2>
                    <button
                        onClick={cargarPQRs}
                        className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
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
                                        Prioridad
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
                                            <div className="text-sm text-gray-900">{pqr.cliente_nombre}</div>
                                            <div className="text-sm text-gray-500">{pqr.cliente_identificacion}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getTipoBadge(pqr.tipo)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate" title={pqr.asunto}>
                                                {pqr.asunto}
                                            </div>
                                            <div className="text-sm text-gray-500">{pqr.categoria}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getEstadoBadge(pqr.estado)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getPrioridadBadge(pqr.prioridad)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {pqrService.formatFecha(pqr.fecha_recepcion)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {pqrService.calcularTiempoTranscurrido(pqr.fecha_recepcion)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button 
                                                    onClick={() => abrirDetalle(pqr)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Ver detalle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => abrirModal(pqr)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => eliminarPQR(pqr.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No se encontraron PQRs</p>
                    </div>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-sm text-gray-700">
                            Página {currentPage} de {totalPages}
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de formulario */}
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

            {/* Modal de detalle */}
            {showDetailModal && selectedPqr && (
                <PQRDetailModal 
                    pqr={selectedPqr}
                    onClose={cerrarDetalle}
                />
            )}
        </div>
    );
};

// Componente Modal para crear/editar PQR
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
    const [usuarios, setUsuarios] = useState([]);
    const [clienteSearch, setClienteSearch] = useState('');

    useEffect(() => {
        cargarClientes();
        cargarUsuarios();
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
                respuesta: pqr.respuesta || '',
                usuario_asignado: pqr.usuario_asignado || '',
                notas_internas: pqr.notas_internas || ''
            });
        }
    }, [pqr]);

    const cargarClientes = async () => {
        try {
            const response = await pqrService.getClientesActivos(clienteSearch);
            if (response.success) {
                setClientes(response.clientes || response.data || []);
            }
        } catch (error) {
            console.error('Error cargando clientes:', error);
        }
    };

    const cargarUsuarios = async () => {
        try {
            const response = await pqrService.getUsuariosDisponibles();
            if (response.success) {
                setUsuarios(response.usuarios || []);
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validar datos
            const validation = pqrService.validatePQRData(formData);
            if (!validation.isValid) {
                alert('Errores en el formulario:\n' + validation.errors.join('\n'));
                return;
            }

            if (pqr) {
                await pqrService.updatePQR(pqr.id, formData);
            } else {
                await pqrService.createPQR(formData);
            }
            
            onSave();
        } catch (error) {
            alert('Error guardando PQR: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                        {pqr ? 'Editar PQR' : 'Nueva PQR'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
                                <option value="">Seleccionar cliente...</option>
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
                                <option value="whatsapp">WhatsApp</option>
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

                        {/* Estado y Usuario Asignado (solo para edición) */}
                        {pqr && (
                            <>
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
                                        <option value="escalado">Escalado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Usuario Asignado
                                    </label>
                                    <select
                                        value={formData.usuario_asignado}
                                        onChange={(e) => handleChange('usuario_asignado', e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Sin asignar</option>
                                        {usuarios.map(usuario => (
                                            <option key={usuario.id} value={usuario.id}>
                                                {usuario.nombre} - {usuario.rol}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
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
                                placeholder="Resumen del caso..."
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

                        {/* Notas Internas (solo para edición) */}
                        {pqr && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notas Internas
                                </label>
                                <textarea
                                    value={formData.notas_internas || ''}
                                    onChange={(e) => handleChange('notas_internas', e.target.value)}
                                    rows={3}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Notas para uso interno..."
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

// Componente Modal de detalle
const PQRDetailModal = ({ pqr, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                        Detalle PQR - {pqr.numero_radicado}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Información del Cliente</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Nombre:</span> {pqr.cliente_nombre}</p>
                                <p><span className="font-medium">Identificación:</span> {pqr.cliente_identificacion}</p>
                                <p><span className="font-medium">Teléfono:</span> {pqr.cliente_telefono}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Información de la PQR</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Tipo:</span> {pqr.tipo}</p>
                                <p><span className="font-medium">Categoría:</span> {pqr.categoria}</p>
                                <p><span className="font-medium">Prioridad:</span> {pqr.prioridad}</p>
                                <p><span className="font-medium">Estado:</span> {pqr.estado}</p>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <h4 className="font-medium text-gray-900 mb-2">Asunto</h4>
                            <p className="text-sm text-gray-700">{pqr.asunto}</p>
                        </div>

                        <div className="md:col-span-2">
                            <h4 className="font-medium text-gray-900 mb-2">Descripción</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pqr.descripcion}</p>
                        </div>

                        {pqr.respuesta && (
                            <div className="md:col-span-2">
                                <h4 className="font-medium text-gray-900 mb-2">Respuesta</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{pqr.respuesta}</p>
                            </div>
                        )}

                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Fechas</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Recepción:</span> {pqrService.formatFecha(pqr.fecha_recepcion)}</p>
                                {pqr.fecha_respuesta && (
                                    <p><span className="font-medium">Respuesta:</span> {pqrService.formatFecha(pqr.fecha_respuesta)}</p>
                                )}
                                <p><span className="font-medium">Tiempo transcurrido:</span> {pqrService.calcularTiempoTranscurrido(pqr.fecha_recepcion)}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Asignación</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Usuario asignado:</span> {pqr.usuario_asignado_nombre || 'Sin asignar'}</p>
                                <p><span className="font-medium">Medio de recepción:</span> {pqr.medio_recepcion}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PQRManagement;