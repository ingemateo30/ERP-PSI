// frontend/src/components/Incidencias/IncidenciasManagement.js
import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Filter, AlertTriangle, CheckCircle, Clock,
    Eye, Edit, MapPin, Users, Calendar, X, Save, RefreshCw,
    Download, ExternalLink, Activity, Zap, Settings, FileText
} from 'lucide-react';
import incidenciasService from '../../services/incidenciasService';

const IncidenciasManagement = () => {
    const [incidencias, setIncidencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedIncidencia, setSelectedIncidencia] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        estado: '',
        tipo_incidencia: '',
        categoria: '',
        fechaInicio: '',
        fechaFin: '',
        search: '',
        page: 1,
        limit: 50
    });
    const [stats, setStats] = useState({
        total: 0,
        reportadas: 0,
        en_atencion: 0,
        resueltas: 0,
        cerradas: 0,
        emergencias_activas: 0,
        tiempo_promedio_resolucion: 0,
        total_usuarios_afectados: 0
    });

    const tiposIncidencia = [
        { value: 'programado', label: 'Programado', color: 'blue', icon: Settings },
        { value: 'no_programado', label: 'No Programado', color: 'orange', icon: AlertTriangle },
        { value: 'emergencia', label: 'Emergencia', color: 'red', icon: Zap }
    ];

    const categoriasIncidencia = [
        { value: 'fibra_cortada', label: 'Fibra Cortada', color: 'red' },
        { value: 'falla_energia', label: 'Falla de Energía', color: 'orange' },
        { value: 'mantenimiento', label: 'Mantenimiento', color: 'blue' },
        { value: 'actualizacion', label: 'Actualización', color: 'green' },
        { value: 'otros', label: 'Otros', color: 'gray' }
    ];

    const estadosIncidencia = [
        { value: 'reportado', label: 'Reportado', color: 'red', icon: AlertTriangle },
        { value: 'en_atencion', label: 'En Atención', color: 'yellow', icon: Activity },
        { value: 'resuelto', label: 'Resuelto', color: 'green', icon: CheckCircle },
        { value: 'cerrado', label: 'Cerrado', color: 'blue', icon: CheckCircle }
    ];

    const mecanismosSolucion = [
        { value: 'reparacion', label: 'Reparación' },
        { value: 'reemplazo', label: 'Reemplazo' },
        { value: 'configuracion', label: 'Configuración' },
        { value: 'otro', label: 'Otro' }
    ];

    useEffect(() => {
        cargarIncidencias();
        cargarEstadisticas();
    }, [filters]);

    // REEMPLAZAR la función cargarIncidencias en IncidenciasManagement.js:

const cargarIncidencias = async () => {
    setLoading(true);
    try {
        const response = await incidenciasService.getIncidencias({
            ...filters,
            page: currentPage
        });
        
        console.log('🔍 Respuesta completa del servicio:', response);
        console.log('🔍 response.incidencias:', response.incidencias);
        
        if (response.success) {
            // ✅ CORRECCIÓN: Los datos vienen en response.incidencias.incidencias
            const incidenciasData = response.incidencias?.incidencias || response.incidencias || response.data || [];
            console.log('✅ Datos de incidencias a establecer:', incidenciasData);
            console.log('✅ Es array?', Array.isArray(incidenciasData));
            console.log('✅ Longitud:', incidenciasData.length);
            
            setIncidencias(incidenciasData);
            
            // ✅ CORRECCIÓN: Pagination también viene en response.incidencias.pagination
            const paginationData = response.incidencias?.pagination || response.pagination;
            if (paginationData) {
                setTotalPages(paginationData.pages || paginationData.total_pages || 1);
            }
        }
    } catch (error) {
        console.error('Error cargando incidencias:', error);
        setIncidencias([]);
    } finally {
        setLoading(false);
    }
};
    const cargarEstadisticas = async () => {
        try {
            const response = await incidenciasService.getEstadisticas();

            console.log('📊 Respuesta estadísticas completa:', response);

            if (response.success && response.estadisticas) {
                const { resumen, por_estado, por_tipo } = response.estadisticas;

                // ✅ MAPEAR los datos del backend al formato que espera el frontend
                const statsFormateadas = {
                    total: resumen?.total_incidencias || 0,
                    reportadas: 0, // Se calculará desde por_estado
                    en_atencion: 0, // Se calculará desde por_estado
                    resueltas: 0, // Se calculará desde por_estado
                    cerradas: 0, // Se calculará desde por_estado
                    emergencias_activas: resumen?.incidencias_activas || 0,
                    tiempo_promedio_resolucion: resumen?.tiempo_promedio_resolucion || 0,
                    total_usuarios_afectados: resumen?.total_usuarios_afectados || 0
                };

                // ✅ PROCESAR estadísticas por estado
                if (Array.isArray(por_estado)) {
                    por_estado.forEach(estado => {
                        switch (estado.estado) {
                            case 'reportado':
                                statsFormateadas.reportadas = estado.cantidad || 0;
                                break;
                            case 'en_atencion':
                                statsFormateadas.en_atencion = estado.cantidad || 0;
                                break;
                            case 'resuelto':
                                statsFormateadas.resueltas = estado.cantidad || 0;
                                break;
                            case 'cerrado':
                                statsFormateadas.cerradas = estado.cantidad || 0;
                                break;
                        }
                    });
                }

                console.log('✅ Estadísticas formateadas:', statsFormateadas);
                setStats(statsFormateadas);
            } else {
                console.log('❌ response.success es false para estadísticas');
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
            tipo_incidencia: '',
            categoria: '',
            fechaInicio: '',
            fechaFin: '',
            search: '',
            page: 1,
            limit: 50
        });
        setCurrentPage(1);
    };

    const abrirModal = (incidencia = null) => {
        setSelectedIncidencia(incidencia);
        setShowModal(true);
    };

    const cerrarModal = () => {
        setShowModal(false);
        setSelectedIncidencia(null);
    };

    const abrirDetalle = (incidencia) => {
        setSelectedIncidencia(incidencia);
        setShowDetailModal(true);
    };

    const cerrarDetalle = () => {
        setShowDetailModal(false);
        setSelectedIncidencia(null);
    };

    const cerrarIncidencia = async (id, datosCierre) => {
        try {
            await incidenciasService.cerrarIncidencia(id, datosCierre);
            cargarIncidencias();
            cargarEstadisticas();
        } catch (error) {
            alert('Error cerrando incidencia: ' + error.message);
        }
    };

    const exportarDatos = () => {
        try {
            incidenciasService.exportarCSV(incidencias, `incidencias_${new Date().toISOString().split('T')[0]}.csv`);
        } catch (error) {
            alert('Error exportando datos: ' + error.message);
        }
    };

    const getEstadoBadge = (estado) => {
        const estadoConfig = estadosIncidencia.find(e => e.value === estado);
        if (!estadoConfig) return null;

        const colorClasses = {
            red: 'bg-red-100 text-red-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            green: 'bg-green-100 text-green-800',
            blue: 'bg-blue-100 text-blue-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[estadoConfig.color]}`}>
                <estadoConfig.icon className="w-3 h-3 mr-1" />
                {estadoConfig.label}
            </span>
        );
    };

    const getTipoBadge = (tipo) => {
        const tipoConfig = tiposIncidencia.find(t => t.value === tipo);
        if (!tipoConfig) return null;

        const colorClasses = {
            blue: 'bg-blue-100 text-blue-800',
            orange: 'bg-orange-100 text-orange-800',
            red: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[tipoConfig.color]}`}>
                <tipoConfig.icon className="w-3 h-3 mr-1" />
                {tipoConfig.label}
            </span>
        );
    };

    const getImpactoBadge = (usuariosAfectados) => {
        const impacto = incidenciasService.getNivelImpacto(usuariosAfectados);
        const colorClasses = {
            gray: 'bg-gray-100 text-gray-800',
            green: 'bg-green-100 text-green-800',
            yellow: 'bg-yellow-100 text-yellow-800',
            orange: 'bg-orange-100 text-orange-800',
            red: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[impacto.color]}`}>
                <Users className="w-3 h-3 mr-1" />
                {impacto.nivel} ({usuariosAfectados})
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Incidencias</h1>
                    <p className="text-gray-600">Administración de incidencias de servicio</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={exportarDatos}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        disabled={incidencias.length === 0}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </button>
                    <button
                        onClick={() => abrirModal()}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Incidencia
                    </button>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-red-600">{stats.reportadas}</div>
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
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-red-600">{stats.emergencias_activas}</div>
                    <div className="text-sm text-gray-600">Emergencias</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-purple-600">
                        {incidenciasService.formatearDuracion(stats.tiempo_promedio_resolucion)}
                    </div>
                    <div className="text-sm text-gray-600">T. Promedio</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-orange-600">{stats.total_usuarios_afectados}</div>
                    <div className="text-sm text-gray-600">Usuarios Afectados</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6">
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
                            {categoriasIncidencia.map(categoria => (
                                <option key={categoria.value} value={categoria.value}>
                                    {categoria.label}
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

            {/* Lista de Incidencias */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Lista de Incidencias ({incidencias.length})
                    </h2>
                    <button
                        onClick={cargarIncidencias}
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
                                        Categoría
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Impacto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ubicación
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
                                            {getTipoBadge(incidencia.tipo_incidencia)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900 capitalize">
                                                {incidencia.categoria.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getEstadoBadge(incidencia.estado)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getImpactoBadge(incidencia.usuarios_afectados)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {incidencia.municipio_nombre || 'N/A'}
                                            </div>
                                            {incidencia.coordenadas_lat && incidencia.coordenadas_lng && (
                                                <a
                                                    href={incidenciasService.getGoogleMapsUrl(incidencia.coordenadas_lat, incidencia.coordenadas_lng)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                                                >
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    Ver mapa
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {incidenciasService.formatFecha(incidencia.fecha_inicio)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {incidenciasService.formatearDuracion(
                                                    incidencia.tiempo_duracion_minutos || incidencia.duracion_minutos
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => abrirDetalle(incidencia)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Ver detalle"
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
                                                {incidencia.estado !== 'cerrado' && (
                                                    <button
                                                        onClick={() => cerrarIncidencia(incidencia.id, {})}
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Cerrar incidencia"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
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
                        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No se encontraron incidencias</p>
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
                <IncidenciaModal
                    incidencia={selectedIncidencia}
                    onClose={cerrarModal}
                    onSave={() => {
                        cargarIncidencias();
                        cargarEstadisticas();
                        cerrarModal();
                    }}
                />
            )}

            {/* Modal de detalle */}
            {showDetailModal && selectedIncidencia && (
                <IncidenciaDetailModal
                    incidencia={selectedIncidencia}
                    onClose={cerrarDetalle}
                    onUpdate={() => {
                        cargarIncidencias();
                        cargarEstadisticas();
                    }}
                />
            )}
        </div>
    );
};

// Componente Modal para crear/editar incidencia
const IncidenciaModal = ({ incidencia, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        tipo: 'no_programado',  // ← CORREGIDO
        titulo: '',
        categoria: 'otros',
        descripcion: '',
        municipio_id: '',
        direccion: '',
        coordenadas_lat: '',
        coordenadas_lng: '',
        usuarios_afectados: 0,
        responsable_id: '',
        observaciones: ''
    });

    const [loading, setLoading] = useState(false);
    const [municipios, setMunicipios] = useState([]);
    const [responsables, setResponsables] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        cargarMunicipios();
        cargarResponsables();
        if (incidencia) {
            setFormData({
                tipo_incidencia: incidencia.tipo_incidencia || 'no_programado',
                categoria: incidencia.categoria || 'otros',
                fecha_inicio: incidencia.fecha_inicio ? incidencia.fecha_inicio.slice(0, 16) : '',
                fecha_fin: incidencia.fecha_fin ? incidencia.fecha_fin.slice(0, 16) : '',
                usuarios_afectados: incidencia.usuarios_afectados || 0,
                municipio_id: incidencia.municipio_id || '',
                direccion: incidencia.direccion || '',
                coordenadas_lat: incidencia.coordenadas_lat || '',
                coordenadas_lng: incidencia.coordenadas_lng || '',
                descripcion: incidencia.descripcion || '',
                causa_raiz: incidencia.causa_raiz || '',
                solucion_aplicada: incidencia.solucion_aplicada || '',
                mecanismo_solucion: incidencia.mecanismo_solucion || '',
                estado: incidencia.estado || 'reportado',
                responsable_id: incidencia.responsable_id || '',
                observaciones: incidencia.observaciones || ''
            });
        }
    }, [incidencia]);

    const cargarMunicipios = async () => {
        try {
            console.log('🏘️ Cargando municipios en modal...');
            const response = await incidenciasService.getMunicipiosDisponibles();
            if (response.success) {
                setMunicipios(response.municipios || []);
                console.log(`✅ ${response.municipios?.length || 0} municipios cargados en modal`);
            } else {
                console.error('❌ Error en respuesta de municipios:', response);
            }
        } catch (error) {
            console.error('❌ Error cargando municipios en modal:', error);
            setMunicipios([]);
        }
    };

    const cargarResponsables = async () => {
        try {
            console.log('👷 Cargando responsables en modal...');
            const response = await incidenciasService.getResponsablesDisponibles();
            if (response.success) {
                setResponsables(response.responsables || []);
                console.log(`✅ ${response.responsables?.length || 0} responsables cargados en modal`);
            } else {
                console.error('❌ Error en respuesta de responsables:', response);
            }
        } catch (error) {
            console.error('❌ Error cargando responsables en modal:', error);
            setResponsables([]);
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
            const validation = incidenciasService.validarIncidencia(formData);
            if (!validation.isValid) {
                alert('Errores en el formulario:\n' + validation.errors.join('\n'));
                return;
            }

            if (incidencia) {
                await incidenciasService.updateIncidencia(incidencia.id, formData);
            } else {
                await incidenciasService.createIncidencia(formData);
            }

            onSave();
        } catch (error) {
            alert('Error guardando incidencia: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                        {incidencia ? 'Editar Incidencia' : 'Nueva Incidencia'}
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

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título *
                            </label>
                            <input
                                type="text"
                                value={formData.titulo}
                                onChange={(e) => handleChange('titulo', e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Título descriptivo de la incidencia..."
                            />
                        </div>
                        {/* Tipo de Incidencia */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de Incidencia *
                            </label>
                            <select
                                value={formData.tipo_incidencia}
                                onChange={(e) => handleChange('tipo_incidencia', e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="programado">Programado</option>
                                <option value="no_programado">No Programado</option>
                                <option value="emergencia">Emergencia</option>
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
                                <option value="fibra_cortada">Fibra Cortada</option>
                                <option value="falla_energia">Falla de Energía</option>
                                <option value="mantenimiento">Mantenimiento</option>
                                <option value="actualizacion">Actualización</option>
                                <option value="otros">Otros</option>
                            </select>
                        </div>

                        {/* Fecha Inicio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha y Hora de Inicio
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.fecha_inicio}
                                onChange={(e) => handleChange('fecha_inicio', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Fecha Fin (solo para edición) */}
                        {incidencia && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha y Hora de Fin
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.fecha_fin || ''}
                                    onChange={(e) => handleChange('fecha_fin', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}

                        {/* Usuarios Afectados */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Usuarios Afectados
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.usuarios_afectados}
                                onChange={(e) => handleChange('usuarios_afectados', parseInt(e.target.value) || 0)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Municipio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Municipio
                            </label>
                            <select
                                value={formData.municipio_id}
                                onChange={(e) => handleChange('municipio_id', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccionar municipio...</option>
                                {municipios.map(municipio => (
                                    <option key={municipio.id} value={municipio.id}>
                                        {municipio.nombre} - {municipio.departamento_nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Dirección */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dirección
                            </label>
                            <input
                                type="text"
                                value={formData.direccion}
                                onChange={(e) => handleChange('direccion', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Dirección específica del incidente..."
                            />
                        </div>

                        {/* Coordenadas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Latitud
                            </label>
                            <input
                                type="number"
                                step="0.000001"
                                value={formData.coordenadas_lat}
                                onChange={(e) => handleChange('coordenadas_lat', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: 4.711"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Longitud
                            </label>
                            <input
                                type="number"
                                step="0.000001"
                                value={formData.coordenadas_lng}
                                onChange={(e) => handleChange('coordenadas_lng', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: -74.072"
                            />
                        </div>

                        {/* Responsable */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Responsable
                            </label>
                            <select
                                value={formData.responsable_id}
                                onChange={(e) => handleChange('responsable_id', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Sin asignar</option>
                                {responsables.map(responsable => (
                                    <option key={responsable.id} value={responsable.id}>
                                        {responsable.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Estado (solo para edición) */}
                        {incidencia && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado
                                </label>
                                <select
                                    value={formData.estado}
                                    onChange={(e) => handleChange('estado', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="reportado">Reportado</option>
                                    <option value="en_atencion">En Atención</option>
                                    <option value="resuelto">Resuelto</option>
                                    <option value="cerrado">Cerrado</option>
                                </select>
                            </div>
                        )}

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
                                placeholder="Describe detalladamente la incidencia..."
                            />
                        </div>

                        {/* Causa Raíz */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Causa Raíz
                            </label>
                            <textarea
                                value={formData.causa_raiz}
                                onChange={(e) => handleChange('causa_raiz', e.target.value)}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Análisis de la causa raíz del problema..."
                            />
                        </div>

                        {/* Campos adicionales para edición */}
                        {incidencia && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Solución Aplicada
                                    </label>
                                    <textarea
                                        value={formData.solucion_aplicada}
                                        onChange={(e) => handleChange('solucion_aplicada', e.target.value)}
                                        rows={3}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Descripción de la solución implementada..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mecanismo de Solución
                                    </label>
                                    <select
                                        value={formData.mecanismo_solucion}
                                        onChange={(e) => handleChange('mecanismo_solucion', e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="reparacion">Reparación</option>
                                        <option value="reemplazo">Reemplazo</option>
                                        <option value="configuracion">Configuración</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Observaciones
                                    </label>
                                    <textarea
                                        value={formData.observaciones}
                                        onChange={(e) => handleChange('observaciones', e.target.value)}
                                        rows={3}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Observaciones adicionales..."
                                    />
                                </div>
                            </>
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
                            {loading ? 'Guardando...' : (incidencia ? 'Actualizar' : 'Crear')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Componente Modal de detalle
const IncidenciaDetailModal = ({ incidencia, onClose, onUpdate }) => {
    const [showCerrarModal, setShowCerrarModal] = useState(false);

    const manejarCierre = async (datosCierre) => {
        try {
            await incidenciasService.cerrarIncidencia(incidencia.id, datosCierre);
            onUpdate();
            setShowCerrarModal(false);
        } catch (error) {
            alert('Error cerrando incidencia: ' + error.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                        Detalle Incidencia - {incidencia.numero_incidencia}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Información General</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Tipo:</span>
                                    <span className="capitalize">{incidencia.tipo_incidencia.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Categoría:</span>
                                    <span className="capitalize">{incidencia.categoria.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Estado:</span>
                                    <span className="capitalize">{incidencia.estado}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Usuarios Afectados:</span>
                                    <span>{incidencia.usuarios_afectados || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Responsable:</span>
                                    <span>{incidencia.responsable_nombre || 'Sin asignar'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Ubicación</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Municipio:</span>
                                    <span>{incidencia.municipio_nombre || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Departamento:</span>
                                    <span>{incidencia.departamento_nombre || 'N/A'}</span>
                                </div>
                                {incidencia.direccion && (
                                    <div>
                                        <span className="font-medium text-gray-600">Dirección:</span>
                                        <p className="mt-1">{incidencia.direccion}</p>
                                    </div>
                                )}
                                {incidencia.coordenadas_lat && incidencia.coordenadas_lng && (
                                    <div>
                                        <span className="font-medium text-gray-600">Coordenadas:</span>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs">
                                                {incidencia.coordenadas_lat}, {incidencia.coordenadas_lng}
                                            </span>
                                            <a
                                                href={incidenciasService.getGoogleMapsUrl(incidencia.coordenadas_lat, incidencia.coordenadas_lng)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 flex items-center"
                                            >
                                                <MapPin className="w-4 h-4 mr-1" />
                                                Ver en Maps
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Fechas y Tiempos</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Inicio:</span>
                                    <span>{incidenciasService.formatFecha(incidencia.fecha_inicio)}</span>
                                </div>
                                {incidencia.fecha_fin && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Fin:</span>
                                        <span>{incidenciasService.formatFecha(incidencia.fecha_fin)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-600">Duración:</span>
                                    <span>
                                        {incidenciasService.formatearDuracion(
                                            incidencia.tiempo_duracion_minutos || incidencia.duracion_minutos
                                        )}
                                    </span>
                                </div>
                                {incidencia.tipo_incidencia !== 'programado' && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">SLA:</span>
                                        <span className={`${incidenciasService.calcularSLA(incidencia.tipo_incidencia, incidencia.fecha_inicio).vencido
                                            ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                            {incidenciasService.calcularSLA(incidencia.tipo_incidencia, incidencia.fecha_inicio).vencido
                                                ? 'Vencido' : 'Dentro del SLA'
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Impacto</h4>
                            <div className="space-y-3">
                                {incidenciasService.getNivelImpacto(incidencia.usuarios_afectados) && (
                                    <div className="flex items-center">
                                        <Users className="w-4 h-4 mr-2 text-gray-500" />
                                        <span className={`px-2 py-1 rounded text-xs font-medium bg-${incidenciasService.getNivelImpacto(incidencia.usuarios_afectados).color}-100 text-${incidenciasService.getNivelImpacto(incidencia.usuarios_afectados).color}-800`}>
                                            {incidenciasService.getNivelImpacto(incidencia.usuarios_afectados).nivel}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <h4 className="font-medium text-gray-900 mb-3">Descripción</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                {incidencia.descripcion}
                            </p>
                        </div>

                        {incidencia.causa_raiz && (
                            <div className="md:col-span-2">
                                <h4 className="font-medium text-gray-900 mb-3">Causa Raíz</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                    {incidencia.causa_raiz}
                                </p>
                            </div>
                        )}

                        {incidencia.solucion_aplicada && (
                            <div className="md:col-span-2">
                                <h4 className="font-medium text-gray-900 mb-3">Solución Aplicada</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                    {incidencia.solucion_aplicada}
                                </p>
                                {incidencia.mecanismo_solucion && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Mecanismo: {incidencia.mecanismo_solucion}
                                    </p>
                                )}
                            </div>
                        )}

                        {incidencia.observaciones && (
                            <div className="md:col-span-2">
                                <h4 className="font-medium text-gray-900 mb-3">Observaciones</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                    {incidencia.observaciones}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                    <div className="flex space-x-3">
                        {incidencia.estado !== 'cerrado' && (
                            <button
                                onClick={() => setShowCerrarModal(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <CheckCircle className="w-4 h-4 mr-2 inline" />
                                Cerrar Incidencia
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Modal para cerrar incidencia */}
            {showCerrarModal && (
                <CerrarIncidenciaModal
                    onClose={() => setShowCerrarModal(false)}
                    onConfirm={manejarCierre}
                />
            )}
        </div>
    );
};

// Componente Modal para cerrar incidencia
const CerrarIncidenciaModal = ({ onClose, onConfirm }) => {
    const [formData, setFormData] = useState({
        solucion_aplicada: '',
        mecanismo_solucion: '',
        observaciones: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Cerrar Incidencia</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Solución Aplicada *
                            </label>
                            <textarea
                                value={formData.solucion_aplicada}
                                onChange={(e) => setFormData(prev => ({ ...prev, solucion_aplicada: e.target.value }))}
                                required
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Describe la solución implementada..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mecanismo de Solución
                            </label>
                            <select
                                value={formData.mecanismo_solucion}
                                onChange={(e) => setFormData(prev => ({ ...prev, mecanismo_solucion: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="reparacion">Reparación</option>
                                <option value="reemplazo">Reemplazo</option>
                                <option value="configuracion">Configuración</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observaciones
                            </label>
                            <textarea
                                value={formData.observaciones}
                                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                                rows={2}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Observaciones adicionales..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Cerrar Incidencia
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IncidenciasManagement;