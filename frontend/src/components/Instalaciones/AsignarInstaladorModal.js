// frontend/src/components/Instalaciones/AsignarInstaladorModal.js - VERSIÓN CORREGIDA

import React, { useState, useEffect } from 'react';
import { X, User, Search, UserCheck, AlertCircle } from 'lucide-react';

const AsignarInstaladorModal = ({ 
    visible, 
    instalacion, 
    instaladores = [], 
    onAsignar, 
    onCerrar,
    procesando = false 
}) => {
    const [instaladorSeleccionado, setInstaladorSeleccionado] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [instaladoresFiltrados, setInstaladoresFiltrados] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (visible) {
            setInstaladorSeleccionado(instalacion?.instalador_id || '');
            setBusqueda('');
            setError('');
        }
    }, [visible, instalacion]);

useEffect(() => {
        if (busqueda.trim() === '') {
            setInstaladoresFiltrados(instaladores);
        } else {
            const filtrados = instaladores.filter(instalador =>
                (instalador.nombre?.toLowerCase().includes(busqueda.toLowerCase())) ||
                (instalador.telefono?.includes(busqueda))
            );
            setInstaladoresFiltrados(filtrados);
        }
    }, [busqueda, instaladores]);

    const handleAsignar = async () => {
        setError('');
        
        if (!instaladorSeleccionado) {
            setError('Debes seleccionar un instalador');
            return;
        }

        try {
            await onAsignar(instalacion.id, instaladorSeleccionado);
        } catch (error) {
            setError(error.message || 'Error asignando instalador');
        }
    };

    const handleCerrar = () => {
        setError('');
        setInstaladorSeleccionado('');
        setBusqueda('');
        onCerrar();
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Asignar Instalador
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Cliente: {instalacion?.cliente_nombre || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                            Instalación ID: {instalacion?.id}
                        </p>
                    </div>
                    <button
                        onClick={handleCerrar}
                        disabled={procesando}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
    {/* Error */}
    {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
        </div>
    )}

                    {/* Búsqueda */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Buscar instalador
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre o identificación..."
                                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={procesando}
                            />
                        </div>
                    </div>

                    {/* Lista de instaladores */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar instalador
                        </label>
                        <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                            {instaladoresFiltrados.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    {instaladores.length === 0 
                                        ? 'No hay instaladores disponibles' 
                                        : 'No se encontraron instaladores'
                                    }
                                </div>
                            ) : (
                                <div className="space-y-1 p-2">
                                    {instaladoresFiltrados.map((instalador) => (
                                        <div
                                            key={instalador.id}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                instaladorSeleccionado == instalador.id
                                                    ? 'bg-blue-50 border-2 border-blue-200'
                                                    : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                            onClick={() => setInstaladorSeleccionado(instalador.id)}
                                        >
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    {instaladorSeleccionado == instalador.id ? (
                                                        <UserCheck className="w-5 h-5 text-blue-600" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="ml-3 flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {instalador.nombre }
                                                    </div>
                                                    {instalador.telefono && (
                                                        <div className="text-sm text-gray-500">
                                                            Tel: {instalador.telefono}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instalador actualmente asignado */}
                    {instalacion?.instalador_nombre_completo && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center">
                                <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                                <div className="text-sm">
                                    <span className="font-medium text-yellow-800">
                                        Instalador actual: 
                                    </span>
                                    <span className="text-yellow-700 ml-1">
                                        {instalacion.instalador_nombre_completo}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Información de la instalación */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Detalles de la instalación
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600">
                            <div>
                                <span className="font-medium">Fecha programada:</span>{' '}
                                {instalacion?.fecha_programada
                                    ? (() => {
                                        const dp = instalacion.fecha_programada.split('T')[0];
                                        const [y, m, d] = dp.split('-').map(Number);
                                        return new Date(y, m - 1, d).toLocaleDateString('es-CO');
                                      })()
                                    : 'N/A'
                                }
                            </div>
                            <div>
                                <span className="font-medium">Hora:</span>{' '}
                                {instalacion?.hora_programada || 'N/A'}
                            </div>
                            <div>
                                <span className="font-medium">Dirección:</span>{' '}
                                {instalacion?.direccion_instalacion || 'N/A'}
                            </div>
                            <div>
                                <span className="font-medium">Estado:</span>{' '}
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    instalacion?.estado === 'programada' 
                                        ? 'bg-blue-100 text-blue-800'
                                        : instalacion?.estado === 'en_proceso'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {instalacion?.estado || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={handleCerrar}
                            disabled={procesando}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAsignar}
                            disabled={!instaladorSeleccionado || procesando || instaladoresFiltrados.length === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {procesando && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            )}
                            {procesando ? 'Asignando...' : 'Asignar Instalador'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsignarInstaladorModal;