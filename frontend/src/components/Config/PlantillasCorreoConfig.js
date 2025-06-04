// frontend/src/components/Config/PlantillasCorreoConfig.js

import React, { useState, useEffect, useMemo } from 'react';
import {
    Mail, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search,
    ArrowLeft, Loader2, AlertCircle, CheckCircle, X, Eye,
    Copy, FileText, Send, Type, Zap, Users, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configService from '../../services/configService';

const PlantillasCorreoConfig = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    // Estados principales
    const [plantillas, setPlantillas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [stats, setStats] = useState(null);

    // Estados para filtros y búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterActivo, setFilterActivo] = useState('');

    // Estados para modal
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'view', 'preview'
    const [editingPlantilla, setEditingPlantilla] = useState(null);
    const [formData, setFormData] = useState({
        titulo: '',
        asunto: '',
        contenido: '',
        tipo: 'general',
        activo: true
    });
    const [previewData, setPreviewData] = useState(null);

    // Verificar permisos
    useEffect(() => {
        if (!hasPermission('supervisor')) {
            navigate('/dashboard');
            return;
        }
    }, [hasPermission, navigate]);

    // Cargar datos iniciales
    useEffect(() => {
        loadPlantillas();
        loadStats();
    }, []);

    const loadPlantillas = async () => {
        console.log('🔄 Iniciando carga de plantillas...');
        setLoading(true);
        setError(null);

        try {
            const response = await configService.getPlantillasCorreo();

            console.log('📡 Respuesta completa de la API:', response);

            let plantillasData = [];

            if (response && response.success && Array.isArray(response.message)) {
                plantillasData = response.message;
                console.log('✅ Usando response.message como array');
            } else if (response && Array.isArray(response.data)) {
                plantillasData = response.data;
                console.log('✅ Usando response.data como array');
            } else if (Array.isArray(response)) {
                plantillasData = response;
                console.log('✅ Usando response directamente como array');
            } else {
                console.error('❌ Estructura de datos inesperada:', response);
                setError('Estructura de respuesta no reconocida del servidor');
                plantillasData = [];
            }

            // Procesar datos correctamente
            const processedPlantillas = plantillasData.map(plantilla => ({
                ...plantilla,
                activo: Boolean(plantilla.activo),
                created_at: plantilla.created_at,
                updated_at: plantilla.updated_at
            }));

            setPlantillas(processedPlantillas);
            console.log('✅ Plantillas cargadas correctamente:', processedPlantillas.length);

        } catch (err) {
            console.error('❌ Error cargando plantillas:', err);
            setError(err.message || 'Error desconocido al cargar plantillas');
            setPlantillas([]);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await configService.getPlantillasCorreoStats();
            if (response && response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.warn('⚠️ Error cargando estadísticas:', err);
        }
    };

    // Filtrar plantillas
    const filteredPlantillas = useMemo(() => {
        if (!Array.isArray(plantillas)) {
            return [];
        }

        return plantillas.filter(plantilla => {
            const matchesSearch = !searchTerm ||
                (plantilla.titulo && plantilla.titulo.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (plantilla.asunto && plantilla.asunto.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (plantilla.contenido && plantilla.contenido.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesType = !filterType || plantilla.tipo === filterType;
            const matchesActivo = filterActivo === '' || plantilla.activo.toString() === filterActivo;

            return matchesSearch && matchesType && matchesActivo;
        });
    }, [plantillas, searchTerm, filterType, filterActivo]);

    // Funciones auxiliares para UI
    const getTypeColor = (tipo) => {
        switch (tipo) {
            case 'facturacion':
                return 'border-blue-500 bg-blue-50';
            case 'corte':
                return 'border-red-500 bg-red-50';
            case 'reconexion':
                return 'border-green-500 bg-green-50';
            case 'bienvenida':
                return 'border-purple-500 bg-purple-50';
            case 'general':
                return 'border-gray-500 bg-gray-50';
            default:
                return 'border-gray-500 bg-gray-50';
        }
    };

    const getTypeIcon = (tipo) => {
        switch (tipo) {
            case 'facturacion':
                return <FileText size={20} className="text-blue-600" />;
            case 'corte':
                return <Zap size={20} className="text-red-600" />;
            case 'reconexion':
                return <CheckCircle size={20} className="text-green-600" />;
            case 'bienvenida':
                return <Users size={20} className="text-purple-600" />;
            case 'general':
                return <Mail size={20} className="text-gray-600" />;
            default:
                return <Mail size={20} className="text-gray-600" />;
        }
    };

    const getTypeLabel = (tipo) => {
        switch (tipo) {
            case 'facturacion':
                return 'Facturación';
            case 'corte':
                return 'Corte de Servicio';
            case 'reconexion':
                return 'Reconexión';
            case 'bienvenida':
                return 'Bienvenida';
            case 'general':
                return 'General';
            default:
                return tipo;
        }
    };

    // Handlers para acciones
    const handleCreate = () => {
        setEditingPlantilla(null);
        setModalType('create');
        setFormData({
            titulo: '',
            asunto: '',
            contenido: '',
            tipo: 'general',
            activo: true
        });
        setShowModal(true);
    };

    const handleEdit = (plantilla) => {
        setEditingPlantilla(plantilla);
        setModalType('edit');
        setFormData({
            titulo: plantilla.titulo || '',
            asunto: plantilla.asunto || '',
            contenido: plantilla.contenido || '',
            tipo: plantilla.tipo || 'general',
            activo: Boolean(plantilla.activo)
        });
        setShowModal(true);
    };

    const handleView = (plantilla) => {
        setEditingPlantilla(plantilla);
        setModalType('view');
        setShowModal(true);
    };

    const handlePreview = async (plantilla) => {
        try {
            setSubmitting(true);
            const response = await configService.previewPlantillaCorreo(plantilla.id);
            if (response && response.success) {
                setPreviewData(response.data);
                setEditingPlantilla(plantilla);
                setModalType('preview');
                setShowModal(true);
            }
        } catch (err) {
            console.error('Error generando preview:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDuplicate = async (plantilla) => {
        try {
            await configService.duplicatePlantillaCorreo(plantilla.id);
            await loadPlantillas();
            await loadStats();
        } catch (err) {
            console.error('Error duplicando plantilla:', err);
            setError(err.message);
        }
    };

    const handleDelete = async (plantilla) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar la plantilla "${plantilla.titulo}"?`)) {
            return;
        }

        try {
            await configService.deletePlantillaCorreo(plantilla.id);
            await loadPlantillas();
            await loadStats();
        } catch (err) {
            console.error('Error eliminando plantilla:', err);
            setError(err.message);
        }
    };

    const handleToggleStatus = async (plantilla) => {
        try {
            await configService.togglePlantillaCorreo(plantilla.id);
            await loadPlantillas();
            await loadStats();
        } catch (err) {
            console.error('Error cambiando estado:', err);
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const plantillaData = {
                titulo: formData.titulo.trim(),
                asunto: formData.asunto.trim(),
                contenido: formData.contenido.trim(),
                tipo: formData.tipo,
                activo: formData.activo
            };

            if (modalType === 'edit' && editingPlantilla) {
                await configService.updatePlantillaCorreo(editingPlantilla.id, plantillaData);
            } else if (modalType === 'create') {
                await configService.createPlantillaCorreo(plantillaData);
            }

            setShowModal(false);
            await loadPlantillas();
            await loadStats();
        } catch (err) {
            console.error('Error guardando plantilla:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
                    <p className="text-gray-600">Cargando plantillas de correo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/config')}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Plantillas de Correo
                                </h1>
                                <p className="text-gray-600">
                                    Administra las plantillas de correo electrónico del sistema
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {plantillas.length} plantillas cargadas, {filteredPlantillas.length} filtradas
                                </p>
                            </div>
                        </div>
                        {hasPermission('administrador') && (
                            <button
                                onClick={handleCreate}
                                className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                            >
                                <Plus size={16} className="mr-2" />
                                Nueva Plantilla
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Plantillas</p>
                                    <p className="text-xl font-bold">{stats.total_plantillas}</p>
                                </div>
                                <Mail size={24} className="text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Activas</p>
                                    <p className="text-xl font-bold">{stats.plantillas_activas}</p>
                                </div>
                                <CheckCircle size={24} className="text-green-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Inactivas</p>
                                    <p className="text-xl font-bold">{stats.plantillas_inactivas}</p>
                                </div>
                                <X size={24} className="text-red-600" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tipos</p>
                                    <p className="text-xl font-bold">{stats.tipos_diferentes}</p>
                                </div>
                                <Type size={24} className="text-purple-600" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
                        <AlertCircle size={20} className="mr-2" />
                        <div>
                            <p className="font-medium">Error cargando plantillas</p>
                            <p className="text-sm">{error}</p>
                        </div>
                        <button
                            onClick={loadPlantillas}
                            className="ml-auto p-1 hover:bg-red-200 rounded"
                        >
                            <Loader2 size={16} />
                        </button>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="mb-6 bg-white rounded-lg shadow-md p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar plantillas por título, asunto o contenido..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                        >
                            <option value="">Todos los tipos</option>
                            <option value="facturacion">Facturación</option>
                            <option value="corte">Corte de Servicio</option>
                            <option value="reconexion">Reconexión</option>
                            <option value="bienvenida">Bienvenida</option>
                            <option value="general">General</option>
                        </select>
                        <select
                            value={filterActivo}
                            onChange={(e) => setFilterActivo(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                        >
                            <option value="">Todos los estados</option>
                            <option value="true">Activas</option>
                            <option value="false">Inactivas</option>
                        </select>
                    </div>
                </div>

                {/* Plantillas Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlantillas.map((plantilla) => (
                        <div
                            key={plantilla.id}
                            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${plantilla.activo
                                    ? `${getTypeColor(plantilla.tipo)} hover:shadow-lg`
                                    : 'border-gray-400 opacity-75'
                                } transition-shadow`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-lg ${plantilla.activo ? getTypeColor(plantilla.tipo).split(' ')[1] : 'bg-gray-100'
                                        }`}>
                                        {getTypeIcon(plantilla.tipo)}
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="font-semibold text-gray-900 line-clamp-1">{plantilla.titulo}</h3>
                                        <p className="text-sm text-gray-500">
                                            {getTypeLabel(plantilla.tipo)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => handleView(plantilla)}
                                        className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                        title="Ver detalles"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => handlePreview(plantilla)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Preview"
                                    >
                                        <Send size={16} />
                                    </button>
                                    {hasPermission('administrador') && (
                                        <>
                                            <button
                                                onClick={() => handleToggleStatus(plantilla)}
                                                className={`p-1 rounded transition-colors ${plantilla.activo
                                                        ? 'text-green-600 hover:bg-green-50'
                                                        : 'text-gray-400 hover:bg-gray-50'
                                                    }`}
                                                title={plantilla.activo ? 'Desactivar' : 'Activar'}
                                            >
                                                {plantilla.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(plantilla)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(plantilla)}
                                                className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                                title="Duplicar"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(plantilla)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Contenido de la plantilla */}
                            <div className="space-y-2 text-sm">
                                {plantilla.asunto && (
                                    <div>
                                        <span className="text-gray-600">Asunto:</span>
                                        <p className="font-medium line-clamp-1">{plantilla.asunto}</p>
                                    </div>
                                )}

                                <div>
                                    <span className="text-gray-600">Vista previa:</span>
                                    <p className="text-gray-700 line-clamp-3 mt-1">
                                        {plantilla.contenido.replace(/<[^>]*>/g, '').substring(0, 150)}
                                        {plantilla.contenido.length > 150 && '...'}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${plantilla.activo
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {plantilla.activo ? 'Activa' : 'Inactiva'}
                                    </span>

                                    <span className="text-xs text-gray-500">
                                        {new Date(plantilla.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredPlantillas.length === 0 && (
                    <div className="text-center py-12">
                        <Mail size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm || filterType || filterActivo ? 'No se encontraron plantillas' : 'No hay plantillas configuradas'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || filterType || filterActivo
                                ? 'Intenta con otros términos de búsqueda o filtros'
                                : 'Comienza agregando tu primera plantilla de correo'
                            }
                        </p>
                        {!searchTerm && !filterType && !filterActivo && hasPermission('administrador') && (
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                            >
                                Agregar Plantilla
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <PlantillaModal
                    type={modalType}
                    plantilla={editingPlantilla}
                    formData={formData}
                    setFormData={setFormData}
                    previewData={previewData}
                    onSubmit={handleSubmit}
                    onClose={() => setShowModal(false)}
                    submitting={submitting}
                />
            )}
        </div>
    );
};

// Componente Modal para Plantilla
const PlantillaModal = ({ type, plantilla, formData, setFormData, previewData, onSubmit, onClose, submitting }) => {
    const isEditing = type === 'edit';
    const isCreating = type === 'create';
    const isViewing = type === 'view';
    const isPreviewing = type === 'preview';
    const isReadOnly = isViewing || isPreviewing;

    const getModalTitle = () => {
        switch (type) {
            case 'create': return 'Nueva Plantilla de Correo';
            case 'edit': return 'Editar Plantilla';
            case 'view': return 'Detalles de la Plantilla';
            case 'preview': return 'Vista Previa de la Plantilla';
            default: return 'Plantilla';
        }
    };

    // Variables disponibles para mostrar al usuario
    const variablesDisponibles = [
        { variable: '{{nombre_cliente}}', descripcion: 'Nombre del cliente' },
        { variable: '{{numero_factura}}', descripcion: 'Número de factura' },
        { variable: '{{fecha_vencimiento}}', descripcion: 'Fecha de vencimiento' },
        { variable: '{{valor_factura}}', descripcion: 'Valor de la factura' },
        { variable: '{{empresa_nombre}}', descripcion: 'Nombre de la empresa' },
        { variable: '{{fecha_actual}}', descripcion: 'Fecha actual' },
        { variable: '{{telefono_soporte}}', descripcion: 'Teléfono de soporte' }
    ];

    const insertVariable = (variable) => {
        if (isReadOnly) return;

        const textarea = document.getElementById('contenido-textarea');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = formData.contenido;
            const before = text.substring(0, start);
            const after = text.substring(end);

            setFormData(prev => ({
                ...prev,
                contenido: before + variable + after
            }));

            // Restaurar posición del cursor
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex">
                {/* Panel principal */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {getModalTitle()}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {isPreviewing && previewData ? (
                            // Vista previa
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-medium text-blue-900 mb-2">Información de la Plantilla</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-blue-700">Título:</span>
                                            <p className="font-medium">{previewData.titulo}</p>
                                        </div>
                                        <div>
                                            <span className="text-blue-700">Tipo:</span>
                                            <p className="font-medium">{previewData.tipo}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Asunto:</h3>
                                    <div className="p-3 bg-gray-50 rounded-lg border">
                                        {previewData.asunto_preview || previewData.asunto}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Contenido:</h3>
                                    <div className="p-4 bg-gray-50 rounded-lg border">
                                        <div
                                            className="prose max-w-none"
                                            dangerouslySetInnerHTML={{
                                                __html: previewData.contenido_preview || previewData.contenido
                                            }}
                                        />
                                    </div>
                                </div>

                                {previewData.variables_disponibles && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <h4 className="font-medium text-yellow-900 mb-2">Variables Utilizadas:</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {previewData.variables_disponibles.map((variable) => (
                                                <span key={variable} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                    {`{{${variable}}}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Formulario de edición/vista
                            <form onSubmit={onSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Título *
                                        </label>
                                        <input
                                            type="text"
                                            value={isViewing ? plantilla?.titulo || '' : formData.titulo}
                                            onChange={(e) => !isReadOnly && setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                                            disabled={isReadOnly}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                                            placeholder="Título de la plantilla"
                                            maxLength={255}
                                            required={!isReadOnly}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tipo *
                                        </label>
                                        <select
                                            value={isViewing ? plantilla?.tipo || '' : formData.tipo}
                                            onChange={(e) => !isReadOnly && setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                                            disabled={isReadOnly}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                                            required={!isReadOnly}
                                        >
                                            <option value="general">General</option>
                                            <option value="facturacion">Facturación</option>
                                            <option value="corte">Corte de Servicio</option>
                                            <option value="reconexion">Reconexión</option>
                                            <option value="bienvenida">Bienvenida</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Asunto
                                    </label>
                                    <input
                                        type="text"
                                        value={isViewing ? plantilla?.asunto || '' : formData.asunto}
                                        onChange={(e) => !isReadOnly && setFormData(prev => ({ ...prev, asunto: e.target.value }))}
                                        disabled={isReadOnly}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                                        placeholder="Asunto del correo"
                                        maxLength={255}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contenido *
                                    </label>
                                    <textarea
                                        id="contenido-textarea"
                                        value={isViewing ? plantilla?.contenido || '' : formData.contenido}
                                        onChange={(e) => !isReadOnly && setFormData(prev => ({ ...prev, contenido: e.target.value }))}
                                        disabled={isReadOnly}
                                        rows={12}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                                        placeholder="Contenido del correo (HTML permitido)"
                                        required={!isReadOnly}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Puedes usar HTML y variables como {formData.nombre_cliente}, {formData.fecha_vencimiento}, etc.
                                    </p>
                                </div>

                                {!isReadOnly && (
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="activo"
                                            checked={formData.activo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                                            className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded"
                                        />
                                        <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                                            Plantilla activa
                                        </label>
                                    </div>
                                )}

                                {isViewing && plantilla && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                        <div>
                                            <p className="text-sm text-gray-500">Creada</p>
                                            <p className="font-medium">
                                                {new Date(plantilla.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Última actualización</p>
                                            <p className="font-medium">
                                                {new Date(plantilla.updated_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex justify-end space-x-3 pt-6 border-t">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {isReadOnly ? 'Cerrar' : 'Cancelar'}
                                    </button>
                                    {!isReadOnly && (
                                        <button
                                            type="submit"
                                            disabled={submitting || !formData.titulo.trim() || !formData.contenido.trim()}
                                            className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={16} className="mr-2" />
                                                    {isCreating ? 'Crear Plantilla' : 'Guardar Cambios'}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Panel lateral de variables (solo en modo edición/creación) */}
                {!isReadOnly && !isPreviewing && (
                    <div className="w-80 border-l bg-gray-50 p-4">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Type size={16} className="mr-2" />
                            Variables Disponibles
                        </h3>
                        <div className="space-y-2">
                            {variablesDisponibles.map((item) => (
                                <div
                                    key={item.variable}
                                    className="p-3 bg-white rounded-lg border hover:border-[#0e6493] cursor-pointer transition-colors"
                                    onClick={() => insertVariable(item.variable)}
                                >
                                    <div className="font-mono text-sm text-[#0e6493] font-medium">
                                        {item.variable}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        {item.descripcion}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-800">
                                <strong>Tip:</strong> Haz clic en cualquier variable para insertarla en el contenido en la posición del cursor.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlantillasCorreoConfig;