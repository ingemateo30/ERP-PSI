// frontend/src/components/Instalaciones/InstalacionModal.js

import React, { useState } from 'react';
import {
    X,
    Edit,
    Trash2,
    Calendar,
    MapPin,
    User,
    Phone,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RotateCcw,
    Play,
    FileText,
    Camera,
    DollarSign,
    Navigation,
    Package,
    Info,
    Settings
} from 'lucide-react';

const InstalacionModal = ({
    instalacion,
    onClose,
    onEdit,
    onDelete,
    onEstadoChange,
    onReagendar,
    onAsignarInstalador,
    permissions
}) => {
    // Estado para controlar confirmaciones
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showEstadoChange, setShowEstadoChange] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [observacionesCambio, setObservacionesCambio] = useState('');

    // Función para formatear fecha
    const formatFecha = (fecha) => {
        if (!fecha) return 'No especificada';

        try {
            return new Date(fecha).toLocaleString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return fecha;
        }
    };

    // Función para formatear moneda
    const formatCurrency = (amount) => {
        if (!amount) return 'No especificado';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Función para obtener información del estado
    const getEstadoInfo = (estado) => {
        const estadosInfo = {
            programada: {
                label: 'Programada',
                icon: <Calendar className="w-4 h-4" />,
                color: 'bg-blue-100 text-blue-800 border-blue-200'
            },
            en_proceso: {
                label: 'En Proceso',
                icon: <Play className="w-4 h-4" />,
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
            },
            completada: {
                label: 'Completada',
                icon: <CheckCircle className="w-4 h-4" />,
                color: 'bg-green-100 text-green-800 border-green-200'
            },
            cancelada: {
                label: 'Cancelada',
                icon: <XCircle className="w-4 h-4" />,
                color: 'bg-red-100 text-red-800 border-red-200'
            },
            reagendada: {
                label: 'Reagendada',
                icon: <RotateCcw className="w-4 h-4" />,
                color: 'bg-purple-100 text-purple-800 border-purple-200'
            }
        };

        return estadosInfo[estado] || {
            label: estado,
            icon: <Clock className="w-4 h-4" />,
            color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    };

    // Función para obtener información del tipo
    const getTipoInfo = (tipo) => {
        const tiposInfo = {
            nueva: 'Nueva Instalación',
            migracion: 'Migración',
            upgrade: 'Upgrade',
            reparacion: 'Reparación'
        };

        return tiposInfo[tipo] || tipo;
    };

    // Verificar si está vencida
    const isVencida = () => {
        if (instalacion.estado === 'completada' || instalacion.estado === 'cancelada') {
            return false;
        }

        const ahora = new Date();
        const fechaProgramada = new Date(instalacion.fecha_programada);

        return fechaProgramada < ahora;
    };

    // Manejar cambio de estado
    const handleEstadoChange = () => {
        if (!nuevoEstado) return;

        onEstadoChange(instalacion.id, nuevoEstado, observacionesCambio);
        setShowEstadoChange(false);
        setNuevoEstado('');
        setObservacionesCambio('');
    };

    // Manejar eliminación
    const handleDelete = () => {
        onDelete(instalacion.id);
        setShowConfirmDelete(false);
    };

    const estadoInfo = getEstadoInfo(instalacion.estado);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                    <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${estadoInfo.color}`}>
                            {estadoInfo.icon}
                            <span className="font-medium">{estadoInfo.label}</span>
                        </div>
                        {isVencida() && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                Vencida
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Botones de acción */}
                        {permissions.canEdit && (
                            <button
                                onClick={() => onEdit(instalacion)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Editar instalación"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                        )}

                        {permissions.canDelete && (
                            <button
                                onClick={() => setShowConfirmDelete(true)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Eliminar instalación"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">

                        {/* Información Principal */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Información del Cliente */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                                    <User className="w-5 h-5 mr-2" />
                                    Información del Cliente
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Cliente</p>
                                        <p className="text-gray-900 font-medium">
                                            {instalacion.cliente_nombres} {instalacion.cliente_apellidos}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Documento</p>
                                        <p className="text-gray-900">{instalacion.numero_documento}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Email</p>
                                        <p className="text-gray-900">{instalacion.cliente_email}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Teléfono</p>
                                        <p className="text-gray-900">{instalacion.cliente_telefono}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Información del Plan */}
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                                    <Package className="w-5 h-5 mr-2" />
                                    Plan de Servicio
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Plan</p>
                                        <p className="text-gray-900 font-medium">{instalacion.plan_nombre}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Tipo</p>
                                        <p className="text-gray-900">{instalacion.plan_tipo}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Precio Mensual</p>
                                        <p className="text-gray-900 font-bold text-green-700">
                                            {formatCurrency(instalacion.plan_precio)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Tipo de Instalación</p>
                                        <p className="text-gray-900">{getTipoInfo(instalacion.tipo_instalacion)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalles de la Instalación */}
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
                                <Settings className="w-5 h-5 mr-2" />
                                Detalles de la Instalación
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Fecha Programada</p>
                                    <p className="text-gray-900 font-medium">{formatFecha(instalacion.fecha_programada)}</p>
                                </div>

                                {instalacion.fecha_realizada && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Fecha Realizada</p>
                                        <p className="text-gray-900 font-medium">{formatFecha(instalacion.fecha_realizada)}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm font-medium text-gray-600">Instalador Asignado</p>
                                    <p className="text-gray-900">
                                        {instalacion.instalador_nombres ?
                                            `${instalacion.instalador_nombres} ${instalacion.instalador_apellidos}` :
                                            'Sin asignar'
                                        }
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-gray-600">Costo de Instalación</p>
                                    <p className="text-gray-900 font-medium">
                                        {formatCurrency(instalacion.costo_instalacion)}
                                    </p>
                                </div>

                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-gray-600 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        Dirección
                                    </p>
                                    <p className="text-gray-900">
                                        {instalacion.direccion_instalacion}
                                        {instalacion.barrio && `, ${instalacion.barrio}`}
                                        {instalacion.ciudad_nombre && `, ${instalacion.ciudad_nombre}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Información de Contacto */}
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                                <Phone className="w-5 h-5 mr-2" />
                                Información de Contacto
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Teléfono de Contacto</p>
                                    <p className="text-gray-900 font-medium">{instalacion.telefono_contacto}</p>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-gray-600">Persona que Recibe</p>
                                    <p className="text-gray-900">{instalacion.persona_recibe || 'No especificado'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Coordenadas GPS */}
                        {(instalacion.coordenadas_lat || instalacion.coordenadas_lng) && (
                            <div className="bg-indigo-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
                                    <Navigation className="w-5 h-5 mr-2" />
                                    Coordenadas GPS
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Latitud</p>
                                        <p className="text-gray-900 font-mono">{instalacion.coordenadas_lat}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Longitud</p>
                                        <p className="text-gray-900 font-mono">{instalacion.coordenadas_lng}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Equipos Instalados */}
                        {instalacion.equipos_instalados && instalacion.equipos_instalados.length > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Package className="w-5 h-5 mr-2" />
                                    Equipos Instalados
                                </h3>

                                <div className="space-y-3">
                                    {instalacion.equipos_instalados.map((equipo, index) => (
                                        <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-600">Equipo</p>
                                                    <p className="text-sm text-gray-900">{equipo.nombre || equipo.codigo}</p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-gray-600">Cantidad</p>
                                                    <p className="text-sm text-gray-900">{equipo.cantidad}</p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-gray-600">Número de Serie</p>
                                                    <p className="text-sm text-gray-900 font-mono">
                                                        {equipo.numero_serie || 'No especificado'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-gray-600">Observaciones</p>
                                                    <p className="text-sm text-gray-900">
                                                        {equipo.observaciones || 'Sin observaciones'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Observaciones */}
                        {instalacion.observaciones && (
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                                    <FileText className="w-5 h-5 mr-2" />
                                    Observaciones
                                </h3>

                                <p className="text-gray-900 whitespace-pre-wrap">{instalacion.observaciones}</p>
                            </div>
                        )}

                        {/* Fotos de la Instalación */}
                        {instalacion.fotos_instalacion && instalacion.fotos_instalacion.length > 0 && (
                            <div className="bg-pink-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-pink-900 mb-4 flex items-center">
                                    <Camera className="w-5 h-5 mr-2" />
                                    Fotos de la Instalación
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {instalacion.fotos_instalacion.map((foto, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={foto.url}
                                                alt={foto.descripcion || `Foto ${index + 1}`}
                                                className="w-full h-32 object-cover rounded-lg border border-pink-200"
                                            />
                                            {foto.descripcion && (
                                                <p className="text-xs text-gray-600 mt-1">{foto.descripcion}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer con acciones rápidas */}
                {permissions.canChangeStatus && instalacion.estado !== 'completada' && instalacion.estado !== 'cancelada' && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Acciones Rápidas</h4>
                        <div className="flex flex-wrap gap-2">
                            {instalacion.estado === 'programada' && (
                                <button
                                    onClick={() => {
                                        setNuevoEstado('en_proceso');
                                        setShowEstadoChange(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                                >
                                    <Play className="w-4 h-4" />
                                    Iniciar Instalación
                                </button>
                            )}

                            {instalacion.estado === 'en_proceso' && (
                                <button
                                    onClick={() => {
                                        setNuevoEstado('completada');
                                        setShowEstadoChange(true);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Marcar Completada
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setNuevoEstado('reagendada');
                                    setShowEstadoChange(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reagendar
                            </button>

                            <button
                                onClick={() => {
                                    setNuevoEstado('cancelada');
                                    setShowEstadoChange(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                                <XCircle className="w-4 h-4" />
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de confirmación para eliminar */}
            {showConfirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas eliminar esta instalación? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmDelete(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para cambio de estado */}
            {showEstadoChange && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Cambiar Estado a: {getEstadoInfo(nuevoEstado).label}
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Observaciones del Cambio
                            </label>
                            <textarea
                                rows="3"
                                value={observacionesCambio}
                                onChange={(e) => setObservacionesCambio(e.target.value)}
                                placeholder="Describe el motivo del cambio de estado..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowEstadoChange(false);
                                    setNuevoEstado('');
                                    setObservacionesCambio('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEstadoChange}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Confirmar Cambio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstalacionModal;