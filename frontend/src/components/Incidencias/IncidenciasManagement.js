// components/Incidencias/IncidenciasManagement.js
import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, AlertTriangle, Clock, CheckCircle, 
    Eye, Edit, MapPin, Users, Calendar, Activity
} from 'lucide-react';

const IncidenciasManagement = () => {
    const [incidencias, setIncidencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedIncidencia, setSelectedIncidencia] = useState(null);
    const [filters, setFilters] = useState({
        estado: '',
        tipo_incidencia: '',
        categoria: '',
        fechaInicio: '',
        fechaFin: '',
        search: ''
    });
    const [stats, setStats] = useState({
        total: 0,
        reportadas: 0,
        en_atencion: 0,
        resueltas: 0,
        cerradas: 0
    });

    const tiposIncidencia = [
        { value: 'programado', label: 'Programado', color: 'blue' },
        { value: 'no_programado', label: 'No Programado', color: 'orange' },
        { value: 'emergencia', label: 'Emergencia', color: 'red' }
    ];

    const estadosIncidencia = [
        { value: 'reportado', label: 'Reportado', color: 'gray', icon: Clock },
        { value: 'en_atencion', label: 'En Atención', color: 'yellow', icon: AlertTriangle },
        { value: 'resuelto', label: 'Resuelto', color: 'green', icon: CheckCircle },
        { value: 'cerrado', label: 'Cerrado', color: 'blue', icon: CheckCircle }
    ];

    const categorias = [
        'fibra_cortada',
        'falla_energia',
        'mantenimiento',
        'actualizacion',
        'otros'
    ];

    useEffect(() => {
        cargarIncidencias();
        cargarEstadisticas();
    }, [filters]);

    const cargarIncidencias = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/incidencias?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setIncidencias(data.incidencias || []);
        } catch (error) {
            console.error('Error cargando incidencias:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarEstadisticas = async () => {
        try {
            const response = await fetch('/api/incidencias/estadisticas', {
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
        const estadoData = estadosIncidencia.find(e => e.value === estado);
        return estadoData ? estadoData.color : 'gray';
    };

    const getTipoColor = (tipo) => {
        const tipoData = tiposIncidencia.find(t => t.value === tipo);
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

    const calcularDuracion = (fechaInicio, fechaFin) => {
        if (!fechaFin) return 'En curso';
        
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        const diffMs = fin - inicio;
        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHoras > 0) {
            return `${diffHoras}h ${diffMinutos}m`;
        } else {
            return `${diffMinutos}m`;
        }
    };

    const abrirModal = (incidencia = null) => {
        setSelectedIncidencia(incidencia);
        setShowModal(true);
    };

    const cerrarModal = () => {
        setSelectedIncidencia(null);
        setShowModal(false);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Gestión de Incidencias
                        </h1>
                        <p className="text-gray-600">
                            Control de incidencias de red y servicio
                        </p>
                    </div>
                    <button
                        onClick={() => abrirModal()}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Incidencia
                    </button>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                        <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-gray-500">{stats.reportadas}</div>
                        <div className="text-sm text-gray-600">Reportadas</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-yellow-600">{stats.en_atencion}</div>
                        <div className="text-sm text-gray-600">En Atención</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-green-600">{stats.resueltas}</div>
                        <div className="text-sm text-gray-600">Resueltas</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-2xl font-bold text-blue-600">{stats.cerradas}</div>
                        <div className="text-sm text-gray-600">Cerradas</div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar
                        </label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Número, descripción..."
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
                            {estadosIncidencia.map(estado => (
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
                            value={filters.tipo_incidencia}
                            onChange={(e) => handleFilterChange('tipo_incidencia', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos los tipos</option>
                            {tiposIncidencia.map(tipo => (
                                <option key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Categoría
                        </label>
                        <select
                            value={filters.categoria}
                            onChange={(e) => handleFilterChange('categoria', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat.replace('_', ' ').toUpperCase()}
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

            {/* Lista de Incidencias */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Lista de Incidencias ({incidencias.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : incidencias.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Número
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Descripción
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Usuarios Afectados
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha Inicio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Duración
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {incidencias.map((incidencia) => (
                                    <tr key={incidencia.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {incidencia.numero_incidencia}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getTipoColor(incidencia.tipo_incidencia)}-100 text-${getTipoColor(incidencia.tipo_incidencia)}-800`}>
                                                {tiposIncidencia.find(t => t.value === incidencia.tipo_incidencia)?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                                {incidencia.descripcion}
                                            </div>
                                            <div className="text-sm text-gray-500 capitalize">
                                                {incidencia.categoria.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getEstadoColor(incidencia.estado)}-100 text-${getEstadoColor(incidencia.estado)}-800`}>
                                                {estadosIncidencia.find(e => e.value === incidencia.estado)?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <Users className="w-4 h-4 mr-1 text-gray-400" />
                                                {incidencia.usuarios_afectados || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatFecha(incidencia.fecha_inicio)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {calcularDuracion(incidencia.fecha_inicio, incidencia.fecha_fin)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex space-x-2 justify-end">
                                                <button
                                                    onClick={() => abrirModal(incidencia)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => abrirModal(incidencia)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {incidencia.direccion && (
                                                    <button
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Ver ubicación"
                                                    >
                                                        <MapPin className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay incidencias registradas
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Comienza registrando la primera incidencia
                        </p>
                        <button
                            onClick={() => abrirModal()}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Incidencia
                        </button>
                    </div>
                )}
            </div>

            {/* Modal placeholder - aquí irían los componentes de modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {selectedIncidencia ? 'Detalles de Incidencia' : 'Nueva Incidencia'}
                            </h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600">
                                {selectedIncidencia 
                                    ? `Incidencia: ${selectedIncidencia.numero_incidencia}`
                                    : 'Formulario para crear nueva incidencia'
                                }
                            </p>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={cerrarModal}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidenciasManagement;