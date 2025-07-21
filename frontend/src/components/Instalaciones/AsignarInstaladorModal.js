// NUEVO ARCHIVO: frontend/src/components/Instalaciones/AsignarInstaladorModal.js

import React, { useState, useEffect } from 'react';
import { X, User, Search, UserCheck } from 'lucide-react';

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

    useEffect(() => {
        if (visible) {
            setInstaladorSeleccionado(instalacion?.instalador_id || '');
            setBusqueda('');
        }
    }, [visible, instalacion]);

    useEffect(() => {
        if (busqueda.trim() === '') {
            setInstaladoresFiltrados(instaladores);
        } else {
            const filtrados = instaladores.filter(instalador =>
                instalador.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
                instalador.identificacion.includes(busqueda)
            );
            setInstaladoresFiltrados(filtrados);
        }
    }, [busqueda, instaladores]);

    const handleAsignar = () => {
        if (!instaladorSeleccionado) {
            alert('Debes seleccionar un instalador');
            return;
        }

        onAsignar(instalacion.id, instaladorSeleccionado);
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
                            Cliente: {instalacion?.cliente_nombre}
                        </p>
                    </div>
                    <button
                        onClick={onCerrar}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6">
                    {/* Búsqueda */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Buscar instalador
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre o identificación..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Lista de instaladores */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar instalador
                        </label>
                        <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                            {instaladoresFiltrados.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    {busqueda ? 'No se encontraron instaladores' : 'No hay instaladores disponibles'}
                                </div>
                            ) : (
                                instaladoresFiltrados.map(instalador => (
                                    <div
                                        key={instalador.id}
                                        onClick={() => setInstaladorSeleccionado(instalador.id)}
                                        className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            instaladorSeleccionado === instalador.id ? 'bg-blue-50 border-blue-200' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                                    <User className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {instalador.nombre_completo}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        ID: {instalador.identificacion}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Activas: {instalador.instalaciones_activas || 0}
                                                    </div>
                                                </div>
                                            </div>
                                            {instaladorSeleccionado === instalador.id && (
                                                <UserCheck className="w-5 h-5 text-blue-600" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Instalador actual */}
                    {instalacion?.instalador_nombre && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center text-yellow-800">
                                <User className="w-4 h-4 mr-2" />
                                <span className="text-sm">
                                    Instalador actual: {instalacion.instalador_nombre}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onCerrar}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAsignar}
                            disabled={!instaladorSeleccionado || procesando}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {procesando && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            )}
                            Asignar Instalador
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsignarInstaladorModal;