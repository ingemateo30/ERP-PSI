// frontend/src/components/Instalaciones/InstalacionesManagement.js

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    RefreshCw,
    Calendar,
    MapPin,
    Users,
    BarChart3,
    Settings,
    Download,
    Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInstalaciones } from '../../hooks/useInstalaciones';
import { ROLE_PERMISSIONS, SUCCESS_MESSAGES } from '../../constants/instalacionesConstants';

// Importar componentes (los crearemos después)
import InstalacionesList from './InstalacionesList';
import InstalacionForm from './InstalacionForm';
import InstalacionModal from './InstalacionModal';
import InstalacionesFilters from './InstalacionesFilters';
import InstalacionesStats from './InstalacionesStats';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorAlert from '../ui/ErrorAlert';
import SuccessAlert from '../ui/SuccessAlert';

const InstalacionesManagement = () => {
    const { user } = useAuth();
    const {
        instalaciones,
        pagination,
        filters,
        loading,
        error,
        permissions,
        metrics,
        estadisticas,
        loadingEstadisticas,
        autoRefreshEnabled,
        setAutoRefreshEnabled,
        changePage,
        changeLimit,
        applyFilters,
        clearFilters,
        refresh,
        createInstalacion,
        updateInstalacion,
        deleteInstalacion,
        cambiarEstado,
        reagendarInstalacion,
        asignarInstalador,
        loadEstadisticas
    } = useInstalaciones();

    // Estados locales
    const [showForm, setShowForm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [selectedInstalacion, setSelectedInstalacion] = useState(null);
    const [showInstalacionModal, setShowInstalacionModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', 'map'
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Cargar estadísticas al montar
    useEffect(() => {
        if (permissions.canViewStats) {
            loadEstadisticas();
        }
    }, [permissions.canViewStats, loadEstadisticas]);

    // Manejar búsqueda
    const handleSearch = (term) => {
        setSearchTerm(term);
        if (term.length >= 2) {
            applyFilters({ ...filters, busqueda: term });
        } else if (term.length === 0) {
            const { busqueda, ...restFilters } = filters;
            applyFilters(restFilters);
        }
    };

    // Manejar selección de instalación
    const handleInstalacionSelect = (instalacion) => {
        setSelectedInstalacion(instalacion);
        setShowInstalacionModal(true);
    };

    // Manejar edición de instalación
    const handleEditInstalacion = (instalacion) => {
        setSelectedInstalacion(instalacion);
        setShowForm(true);
    };

    // Cerrar formulario
    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedInstalacion(null);
    };

    // Manejar instalación guardada
    const handleInstalacionSaved = (message = SUCCESS_MESSAGES.CREATED) => {
        handleCloseForm();
        showSuccessMessage(message);
        refresh();
    };

    // Manejar cambio de estado
    const handleEstadoChange = async (instalacion, nuevoEstado, datos = {}) => {
        try {
            await cambiarEstado(instalacion.id, nuevoEstado, datos);
            showSuccessMessage(SUCCESS_MESSAGES.STATUS_CHANGED);
            setShowInstalacionModal(false);
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    // Manejar reagendamiento
    const handleReagendar = async (instalacion, nuevaFecha, motivo) => {
        try {
            await reagendarInstalacion(instalacion.id, nuevaFecha, motivo);
            showSuccessMessage(SUCCESS_MESSAGES.RESCHEDULED);
            setShowInstalacionModal(false);
        } catch (error) {
            console.error('Error reagendando:', error);
        }
    };

    // Manejar asignación de instalador
    const handleAsignarInstalador = async (instalacion, instaladorId) => {
        try {
            await asignarInstalador(instalacion.id, instaladorId);
            showSuccessMessage(SUCCESS_MESSAGES.INSTALLER_ASSIGNED);
            setShowInstalacionModal(false);
        } catch (error) {
            console.error('Error asignando instalador:', error);
        }
    };

    // Manejar eliminación
    const handleDeleteInstalacion = async (instalacion) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta instalación?')) {
            try {
                await deleteInstalacion(instalacion.id);
                showSuccessMessage(SUCCESS_MESSAGES.DELETED);
                setShowInstalacionModal(false);
            } catch (error) {
                console.error('Error eliminando instalación:', error);
            }
        }
    };

    // Mostrar mensaje de éxito
    const showSuccessMessage = (message) => {
        setSuccessMessage(message);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
    };

    // Manejar cambio de modo de vista
    const handleViewModeChange = (mode) => {
        setViewMode(mode);
    };

    // Manejar toggle de auto-refresh
    const handleAutoRefreshToggle = () => {
        setAutoRefreshEnabled(!autoRefreshEnabled);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Gestión de Instalaciones
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Administra las instalaciones de servicios de internet y televisión
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botón de auto-refresh */}
                    <button
                        onClick={handleAutoRefreshToggle}
                        className={`p-2 rounded-lg border transition-colors ${autoRefreshEnabled
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                            }`}
                        title={`Auto-actualización ${autoRefreshEnabled ? 'activada' : 'desactivada'}`}
                    >
                        <Bell className="w-4 h-4" />
                    </button>

                    {/* Botón de estadísticas */}
                    {permissions.canViewStats && (
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <BarChart3 className="w-4 h-4 inline mr-2" />
                            Estadísticas
                        </button>
                    )}

                    {/* Botón de crear instalación */}
                    {permissions.canCreate && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#0e6493] rounded-lg hover:bg-[#0e6493]/90 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Instalación
                        </button>
                    )}
                </div>
            </div>

            {/* Alertas */}
            {showSuccess && (
                <SuccessAlert
                    message={successMessage}
                    onClose={() => setShowSuccess(false)}
                />
            )}

            {error && (
                <ErrorAlert
                    message={error}
                    onRetry={refresh}
                />
            )}

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">{metrics.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-blue-600">{metrics.programadas}</div>
                    <div className="text-sm text-gray-600">Programadas</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-yellow-600">{metrics.enProceso}</div>
                    <div className="text-sm text-gray-600">En Proceso</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-green-600">{metrics.completadas}</div>
                    <div className="text-sm text-gray-600">Completadas</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-red-600">{metrics.vencidas}</div>
                    <div className="text-sm text-gray-600">Vencidas</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-purple-600">{metrics.reagendadas}</div>
                    <div className="text-sm text-gray-600">Reagendadas</div>
                </div>
            </div>

            {/* Barra de herramientas */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Búsqueda */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar por cliente, dirección o instalador..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center gap-2">
                        {/* Filtros */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showFilters || Object.keys(filters).length > 0
                                ? 'bg-[#0e6493] text-white border-[#0e6493]'
                                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <Filter className="w-4 h-4 inline mr-2" />
                            Filtros
                            {Object.keys(filters).length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                                    {Object.keys(filters).length}
                                </span>
                            )}
                        </button>

                        {/* Refresh */}
                        <button
                            onClick={refresh}
                            disabled={loading}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Modos de vista */}
                        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => handleViewModeChange('list')}
                                className={`px-3 py-2 text-sm ${viewMode === 'list'
                                    ? 'bg-[#0e6493] text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                title="Vista de lista"
                            >
                                <Users className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleViewModeChange('calendar')}
                                className={`px-3 py-2 text-sm border-l border-gray-300 ${viewMode === 'calendar'
                                    ? 'bg-[#0e6493] text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                title="Vista de calendario"
                            >
                                <Calendar className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleViewModeChange('map')}
                                className={`px-3 py-2 text-sm border-l border-gray-300 ${viewMode === 'map'
                                    ? 'bg-[#0e6493] text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                title="Vista de mapa"
                            >
                                <MapPin className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Exportar */}
                        {permissions.canViewAll && (
                            <button
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                title="Exportar datos"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Panel de filtros */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <InstalacionesFilters
                            filters={filters}
                            onApplyFilters={applyFilters}
                            onClearFilters={clearFilters}
                            permissions={permissions}
                        />
                    </div>
                )}
            </div>

            {/* Panel de estadísticas */}
            {showStats && permissions.canViewStats && (
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Estadísticas Detalladas</h3>
                    </div>
                    <div className="p-4">
                        <InstalacionesStats
                            estadisticas={estadisticas}
                            loading={loadingEstadisticas}
                            onRefresh={loadEstadisticas}
                        />
                    </div>
                </div>
            )}

            {/* Contenido principal */}
            <div className="bg-white rounded-lg border border-gray-200">
                {loading && !instalaciones.length ? (
                    <div className="p-8">
                        <LoadingSpinner message="Cargando instalaciones..." />
                    </div>
                ) : (
                    <>
                        {/* Lista de instalaciones */}
                        {viewMode === 'list' && (
                            <InstalacionesList
                                instalaciones={instalaciones}
                                pagination={pagination}
                                loading={loading}
                                permissions={permissions}
                                onInstalacionSelect={handleInstalacionSelect}
                                onEditInstalacion={handleEditInstalacion}
                                onDeleteInstalacion={handleDeleteInstalacion}
                                onEstadoChange={handleEstadoChange}
                                onChangePage={changePage}
                                onChangeLimit={changeLimit}
                            />
                        )}

                        {/* Vista de calendario */}
                        {viewMode === 'calendar' && (
                            <div className="p-8 text-center">
                                <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Vista de Calendario</h3>
                                <p className="text-gray-600">Próximamente disponible</p>
                            </div>
                        )}

                        {/* Vista de mapa */}
                        {viewMode === 'map' && (
                            <div className="p-8 text-center">
                                <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Vista de Mapa</h3>
                                <p className="text-gray-600">Próximamente disponible</p>
                            </div>
                        )}

                        {/* Estado vacío */}
                        {!loading && instalaciones.length === 0 && (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Settings className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No hay instalaciones
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {Object.keys(filters).length > 0
                                        ? 'No se encontraron instalaciones con los filtros aplicados'
                                        : 'Comienza creando tu primera instalación'
                                    }
                                </p>
                                {Object.keys(filters).length > 0 ? (
                                    <button
                                        onClick={clearFilters}
                                        className="px-4 py-2 text-sm font-medium text-[#0e6493] bg-[#0e6493]/10 rounded-lg hover:bg-[#0e6493]/20"
                                    >
                                        Limpiar filtros
                                    </button>
                                ) : permissions.canCreate ? (
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="px-4 py-2 text-sm font-medium text-white bg-[#0e6493] rounded-lg hover:bg-[#0e6493]/90"
                                    >
                                        <Plus className="w-4 h-4 inline mr-2" />
                                        Nueva Instalación
                                    </button>
                                ) : null}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de formulario */}
            {showForm && (
                <InstalacionForm
                    instalacion={selectedInstalacion}
                    onClose={handleCloseForm}
                    onSave={handleInstalacionSaved}
                    permissions={permissions}
                />
            )}

            {/* Modal de detalles */}
            {showInstalacionModal && selectedInstalacion && (
                <InstalacionModal
                    instalacion={selectedInstalacion}
                    onClose={() => setShowInstalacionModal(false)}
                    onEdit={handleEditInstalacion}
                    onDelete={handleDeleteInstalacion}
                    onEstadoChange={handleEstadoChange}
                    onReagendar={handleReagendar}
                    onAsignarInstalador={handleAsignarInstalador}
                    permissions={permissions}
                />
            )}
        </div>
    );
};

export default InstalacionesManagement;