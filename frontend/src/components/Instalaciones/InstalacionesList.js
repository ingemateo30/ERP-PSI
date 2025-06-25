// frontend/src/components/Instalaciones/InstalacionesList.js

import React from 'react';
import {
    Eye,
    Edit,
    Trash2,
    Calendar,
    MapPin,
    User,
    Phone,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RotateCcw,
    Play
} from 'lucide-react';
import { instalacionesService } from '../../services/instalacionesService';
import {
    ESTADOS_INSTALACION,
    ESTADOS_LABELS,
    ESTADOS_CSS,
    TIPOS_LABELS
} from '../../constants/instalacionesConstants';

const InstalacionesList = ({
    instalaciones,
    pagination,
    loading,
    permissions,
    onInstalacionSelect,
    onEditInstalacion,
    onDeleteInstalacion,
    onEstadoChange,
    onChangePage,
    onChangeLimit
}) => {

    // Formatear fecha
    const formatFecha = (fecha) => {
        if (!fecha) return 'No especificada';

        try {
            return new Date(fecha).toLocaleString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return fecha;
        }
    };

    // Verificar si está vencida
    const isVencida = (fechaProgramada, estado) => {
        if (estado === ESTADOS_INSTALACION.COMPLETADA || estado === ESTADOS_INSTALACION.CANCELADA) {
            return false;
        }

        const ahora = new Date();
        const fecha = new Date(fechaProgramada);

        return fecha < ahora;
    };

    // Obtener icono del estado
    const getEstadoIcon = (estado) => {
        const iconProps = { className: "w-4 h-4" };

        switch (estado) {
            case ESTADOS_INSTALACION.PROGRAMADA:
                return <Calendar {...iconProps} />;
            case ESTADOS_INSTALACION.EN_PROCESO:
                return <Play {...iconProps} />;
            case ESTADOS_INSTALACION.COMPLETADA:
                return <CheckCircle {...iconProps} />;
            case ESTADOS_INSTALACION.CANCELADA:
                return <XCircle {...iconProps} />;
            case ESTADOS_INSTALACION.REAGENDADA:
                return <RotateCcw {...iconProps} />;
            default:
                return <Clock {...iconProps} />;
        }
    };

    // Manejar cambio rápido de estado
    const handleQuickStatusChange = (instalacion, nuevoEstado) => {
        const confirmMessages = {
            [ESTADOS_INSTALACION.EN_PROCESO]: '¿Iniciar esta instalación?',
            [ESTADOS_INSTALACION.COMPLETADA]: '¿Marcar como completada?',
            [ESTADOS_INSTALACION.CANCELADA]: '¿Cancelar esta instalación?'
        };

        if (window.confirm(confirmMessages[nuevoEstado])) {
            onEstadoChange(instalacion, nuevoEstado);
        }
    };

    if (loading && !instalaciones.length) {
        return (
            <div className="p-8 text-center">
                <div className="animate-pulse">
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Tabla para pantallas grandes */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cliente / Dirección
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Plan / Tipo
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha Programada
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Instalador
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {instalaciones.map((instalacion) => {
                            const vencida = isVencida(instalacion.fecha_programada, instalacion.estado);

                            return (
                                <tr
                                    key={instalacion.id}
                                    className={`hover:bg-gray-50 ${vencida ? 'bg-red-50' : ''}`}
                                >
                                    {/* Cliente y Dirección */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {instalacion.nombres} {instalacion.apellidos}
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {instalacion.direccion_instalacion}
                                                </div>
                                                {instalacion.telefono_contacto && (
                                                    <div className="text-xs text-gray-400 flex items-center mt-1">
                                                        <Phone className="w-3 h-3 mr-1" />
                                                        {instalacion.telefono_contacto}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Plan y Tipo */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{instalacion.plan_nombre}</div>
                                        <div className="text-sm text-gray-500">
                                            {TIPOS_LABELS[instalacion.tipo_instalacion] || instalacion.tipo_instalacion}
                                        </div>
                                        {instalacion.costo_instalacion > 0 && (
                                            <div className="text-xs text-green-600 font-medium">
                                                ${instalacion.costo_instalacion?.toLocaleString()}
                                            </div>
                                        )}
                                    </td>

                                    {/* Fecha Programada */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-sm ${vencida ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                            {formatFecha(instalacion.fecha_programada)}
                                        </div>
                                        {vencida && (
                                            <div className="flex items-center text-xs text-red-500 mt-1">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Vencida
                                            </div>
                                        )}
                                    </td>

                                    {/* Instalador */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {instalacion.instalador_nombres ? (
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-[#0e6493]/10 rounded-full flex items-center justify-center mr-2">
                                                    <User className="w-4 h-4 text-[#0e6493]" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-900">
                                                        {instalacion.instalador_nombres} {instalacion.instalador_apellidos}
                                                    </div>
                                                    {instalacion.instalador_telefono && (
                                                        <div className="text-xs text-gray-500">
                                                            {instalacion.instalador_telefono}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">Sin asignar</span>
                                        )}
                                    </td>

                                    {/* Estado */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ESTADOS_CSS[instalacion.estado]}`}>
                                                {getEstadoIcon(instalacion.estado)}
                                                <span className="ml-1">{ESTADOS_LABELS[instalacion.estado]}</span>
                                            </span>
                                        </div>
                                    </td>

                                    {/* Acciones */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            {/* Ver detalles */}
                                            <button
                                                onClick={() => onInstalacionSelect(instalacion)}
                                                className="text-[#0e6493] hover:text-[#0e6493]/80"
                                                title="Ver detalles"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {/* Editar */}
                                            {permissions.canEdit && (
                                                <button
                                                    onClick={() => onEditInstalacion(instalacion)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Acciones rápidas de estado */}
                                            {permissions.canChangeStatus && (
                                                <>
                                                    {instalacion.estado === ESTADOS_INSTALACION.PROGRAMADA && (
                                                        <button
                                                            onClick={() => handleQuickStatusChange(instalacion, ESTADOS_INSTALACION.EN_PROCESO)}
                                                            className="text-yellow-600 hover:text-yellow-800"
                                                            title="Iniciar instalación"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {instalacion.estado === ESTADOS_INSTALACION.EN_PROCESO && (
                                                        <button
                                                            onClick={() => handleQuickStatusChange(instalacion, ESTADOS_INSTALACION.COMPLETADA)}
                                                            className="text-green-600 hover:text-green-800"
                                                            title="Marcar como completada"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {/* Eliminar */}
                                            {permissions.canDelete && (
                                                <button
                                                    onClick={() => onDeleteInstalacion(instalacion)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Cards para pantallas pequeñas */}
            <div className="lg:hidden space-y-4 p-4">
                {instalaciones.map((instalacion) => {
                    const vencida = isVencida(instalacion.fecha_programada, instalacion.estado);

                    return (
                        <div
                            key={instalacion.id}
                            className={`bg-white border rounded-lg p-4 ${vencida ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                            onClick={() => onInstalacionSelect(instalacion)}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-gray-900">
                                        {instalacion.nombres} {instalacion.apellidos}
                                    </h3>
                                    <p className="text-xs text-gray-500 flex items-center mt-1">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {instalacion.direccion_instalacion}
                                    </p>
                                </div>

                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${ESTADOS_CSS[instalacion.estado]}`}>
                                    {getEstadoIcon(instalacion.estado)}
                                    <span className="ml-1">{ESTADOS_LABELS[instalacion.estado]}</span>
                                </span>
                            </div>

                            {/* Detalles */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-gray-500">Plan:</span>
                                    <div className="font-medium">{instalacion.plan_nombre}</div>
                                </div>

                                <div>
                                    <span className="text-gray-500">Tipo:</span>
                                    <div className="font-medium">
                                        {TIPOS_LABELS[instalacion.tipo_instalacion] || instalacion.tipo_instalacion}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-gray-500">Fecha:</span>
                                    <div className={`font-medium ${vencida ? 'text-red-600' : ''}`}>
                                        {formatFecha(instalacion.fecha_programada)}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-gray-500">Instalador:</span>
                                    <div className="font-medium">
                                        {instalacion.instalador_nombres
                                            ? `${instalacion.instalador_nombres} ${instalacion.instalador_apellidos}`
                                            : 'Sin asignar'
                                        }
                                    </div>
                                </div>
                            </div>

                            {/* Alerta de vencida */}
                            {vencida && (
                                <div className="flex items-center text-xs text-red-600 mt-2 pt-2 border-t border-red-200">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Instalación vencida
                                </div>
                            )}

                            {/* Acciones móviles */}
                            <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
                                {permissions.canEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditInstalacion(instalacion);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                )}

                                {permissions.canDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteInstalacion(instalacion);
                                        }}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Paginación */}
            {pagination.totalPaginas > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => onChangePage(pagination.paginaActual - 1)}
                            disabled={pagination.paginaActual <= 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => onChangePage(pagination.paginaActual + 1)}
                            disabled={pagination.paginaActual >= pagination.totalPaginas}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente
                        </button>
                    </div>

                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-700">
                                Mostrando{' '}
                                <span className="font-medium">
                                    {Math.min((pagination.paginaActual - 1) * pagination.limite + 1, pagination.total)}
                                </span>{' '}
                                a{' '}
                                <span className="font-medium">
                                    {Math.min(pagination.paginaActual * pagination.limite, pagination.total)}
                                </span>{' '}
                                de{' '}
                                <span className="font-medium">{pagination.total}</span>{' '}
                                resultados
                            </p>

                            {/* Selector de límite */}
                            <select
                                value={pagination.limite}
                                onChange={(e) => onChangeLimit(parseInt(e.target.value))}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-gray-700">por página</span>
                        </div>

                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => onChangePage(pagination.paginaActual - 1)}
                                    disabled={pagination.paginaActual <= 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>

                                {/* Números de página */}
                                {[...Array(Math.min(5, pagination.totalPaginas))].map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => onChangePage(pageNum)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pageNum === pagination.paginaActual
                                                    ? 'z-10 bg-[#0e6493] border-[#0e6493] text-white'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => onChangePage(pagination.paginaActual + 1)}
                                    disabled={pagination.paginaActual >= pagination.totalPaginas}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Siguiente
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstalacionesList;