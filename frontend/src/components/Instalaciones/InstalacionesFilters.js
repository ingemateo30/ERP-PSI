// frontend/src/components/Instalaciones/InstalacionesFilters.js

import React, { useState, useEffect } from 'react';
import {
    X, Search, Calendar, User, MapPin, Clock, Filter, RotateCcw, Check
} from 'lucide-react';

import { instalacionesService } from '../../services/instalacionesService';

const InstalacionesFilters = ({ filtros, onAplicarFiltros, onCerrar }) => {
    // Estados locales para el formulario de filtros
    const [filtrosLocales, setFiltrosLocales] = useState({
        busqueda: '',
        estado: '',
        tipo_instalacion: '',
        instalador_id: '',
        ciudad_id: '',
        fecha_desde: '',
        fecha_hasta: '',
        vencidas: false,
        solo_hoy: false,
        solo_esta_semana: false,
        costo_minimo: '',
        costo_maximo: ''
    });

    // Estados para listas de opciones
    const [instaladores, setInstaladores] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    // Estados de UI
    const [mostrandoFiltrosAvanzados, setMostrandoFiltrosAvanzados] = useState(false);

    // Sincronizar filtros externos con estado local
    useEffect(() => {
        setFiltrosLocales(prevState => ({
            ...prevState,
            ...filtros
        }));
    }, [filtros]);

    // Cargar opciones al montar el componente
    useEffect(() => {
        cargarOpciones();
    }, []);

    // ==========================================
    // CARGA DE DATOS
    // ==========================================

    const cargarOpciones = async () => {
        setLoadingOptions(true);
        try {
            // Cargar instaladores
            const instaladoresRes = await instalacionesService.getInstaladores();
if (instaladoresRes?.success && instaladoresRes?.data) {
  setInstaladores(instaladoresRes.data);
} else if (Array.isArray(instaladoresRes)) {
  setInstaladores(instaladoresRes);
}

            // Cargar ciudades (simulado - en producción vendría de la API)
            setCiudades([
                { id: 1, nombre: 'Bogotá' },
                { id: 2, nombre: 'Medellín' },
                { id: 3, nombre: 'Cali' },
                { id: 4, nombre: 'Barranquilla' },
                { id: 5, nombre: 'Cartagena' },
                { id: 6, nombre: 'Bucaramanga' }
            ]);

        } catch (error) {
            console.error('Error cargando opciones de filtros:', error);
        } finally {
            setLoadingOptions(false);
        }
    };

    // ==========================================
    // MANEJO DE FILTROS
    // ==========================================

    const handleFilterChange = (campo, valor) => {
        setFiltrosLocales(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    const handleCheckboxChange = (campo) => {
        setFiltrosLocales(prev => ({
            ...prev,
            [campo]: !prev[campo]
        }));
    };

    const aplicarFiltros = () => {
        // Limpiar filtros vacíos
        const filtrosLimpios = Object.entries(filtrosLocales).reduce((acc, [key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {});

        onAplicarFiltros(filtrosLimpios);
    };

    const limpiarFiltros = () => {
        const filtrosVacios = {
            busqueda: '',
            estado: '',
            tipo_instalacion: '',
            instalador_id: '',
            ciudad_id: '',
            fecha_desde: '',
            fecha_hasta: '',
            vencidas: false,
            solo_hoy: false,
            solo_esta_semana: false,
            costo_minimo: '',
            costo_maximo: ''
        };
        setFiltrosLocales(filtrosVacios);
        onAplicarFiltros(filtrosVacios);
    };

    const aplicarFiltroRapido = (campo, valor) => {
        const nuevosFiltros = {
            ...filtrosLocales,
            [campo]: valor
        };
        setFiltrosLocales(nuevosFiltros);
        onAplicarFiltros(nuevosFiltros);
    };

    // ==========================================
    // FUNCIONES DE UTILIDAD
    // ==========================================

    const obtenerFechaHoy = () => {
        return new Date().toISOString().split('T')[0];
    };

    const obtenerFechaEstaSemana = () => {
        const hoy = new Date();
        const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
        const finSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 6));
        
        return {
            inicio: inicioSemana.toISOString().split('T')[0],
            fin: finSemana.toISOString().split('T')[0]
        };
    };

    const contarFiltrosActivos = () => {
        return Object.values(filtrosLocales).filter(valor => 
            valor !== '' && valor !== null && valor !== undefined && valor !== false
        ).length;
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Filtros de Instalaciones
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {contarFiltrosActivos()} filtro(s) activo(s)
                        </p>
                    </div>
                    <button
                        onClick={onCerrar}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    
                    {/* Filtros Rápidos */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros Rápidos</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button
                                onClick={() => aplicarFiltroRapido('solo_hoy', true)}
                                className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                                    filtrosLocales.solo_hoy
                                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <Calendar className="w-4 h-4 mx-auto mb-1" />
                                Solo Hoy
                            </button>

                            <button
                                onClick={() => aplicarFiltroRapido('vencidas', true)}
                                className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                                    filtrosLocales.vencidas
                                        ? 'bg-red-100 border-red-300 text-red-800'
                                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <Clock className="w-4 h-4 mx-auto mb-1" />
                                Vencidas
                            </button>

                            <button
                                onClick={() => aplicarFiltroRapido('estado', 'completada')}
                                className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                                    filtrosLocales.estado === 'completada'
                                        ? 'bg-green-100 border-green-300 text-green-800'
                                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <Check className="w-4 h-4 mx-auto mb-1" />
                                Completadas
                            </button>

                            <button
                                onClick={() => aplicarFiltroRapido('estado', 'programada')}
                                className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                                    filtrosLocales.estado === 'programada'
                                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <Calendar className="w-4 h-4 mx-auto mb-1" />
                                Programadas
                            </button>
                        </div>
                    </div>

                    {/* Filtros Principales */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros Principales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            
                            {/* Búsqueda */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Búsqueda General
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Cliente, dirección..."
                                        value={filtrosLocales.busqueda}
                                        onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Estado */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estado
                                </label>
                                <select
                                    value={filtrosLocales.estado}
                                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="programada">Programada</option>
                                    <option value="en_proceso">En Proceso</option>
                                    <option value="completada">Completada</option>
                                    <option value="cancelada">Cancelada</option>
                                    <option value="reagendada">Reagendada</option>
                                </select>
                            </div>

                            {/* Tipo de Instalación */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Instalación
                                </label>
                                <select
                                    value={filtrosLocales.tipo_instalacion}
                                    onChange={(e) => handleFilterChange('tipo_instalacion', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="nueva">Nueva Instalación</option>
                                    <option value="migracion">Migración</option>
                                    <option value="upgrade">Actualización</option>
                                    <option value="reparacion">Reparación</option>
                                </select>
                            </div>

                            {/* Instalador */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Instalador
                                </label>
                                <select
                                    value={filtrosLocales.instalador_id}
                                    onChange={(e) => handleFilterChange('instalador_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={loadingOptions}
                                >
                                    <option value="">Todos los instaladores</option>
                                    {instaladores.map(instalador => (
  <option key={instalador.id} value={instalador.id}>
    {instalador.nombre || `${instalador.nombres} ${instalador.apellidos}`}
  </option>
))}
                                </select>
                            </div>

                            {/* Ciudad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ciudad
                                </label>
                                <select
                                    value={filtrosLocales.ciudad_id}
                                    onChange={(e) => handleFilterChange('ciudad_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Todas las ciudades</option>
                                    {ciudades.map(ciudad => (
                                        <option key={ciudad.id} value={ciudad.id}>
                                            {ciudad.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Fecha Desde */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha Desde
                                </label>
                                <input
                                    type="date"
                                    value={filtrosLocales.fecha_desde}
                                    onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Fecha Hasta */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha Hasta
                                </label>
                                <input
                                    type="date"
                                    value={filtrosLocales.fecha_hasta}
                                    onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros Avanzados */}
                    <div className="mb-6">
                        <button
                            onClick={() => setMostrandoFiltrosAvanzados(!mostrandoFiltrosAvanzados)}
                            className="flex items-center text-blue-600 hover:text-blue-800 font-medium mb-4"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            {mostrandoFiltrosAvanzados ? 'Ocultar' : 'Mostrar'} Filtros Avanzados
                        </button>

                        {mostrandoFiltrosAvanzados && (
                            <div className="space-y-4">
                                {/* Filtros de Costo */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Rango de Costo</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Costo Mínimo
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={filtrosLocales.costo_minimo}
                                                onChange={(e) => handleFilterChange('costo_minimo', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Costo Máximo
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="1000000"
                                                value={filtrosLocales.costo_maximo}
                                                onChange={(e) => handleFilterChange('costo_maximo', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Opciones Booleanas */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Opciones Especiales</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filtrosLocales.vencidas}
                                                onChange={() => handleCheckboxChange('vencidas')}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Solo instalaciones vencidas
                                            </span>
                                        </label>

                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filtrosLocales.solo_hoy}
                                                onChange={() => handleCheckboxChange('solo_hoy')}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Solo instalaciones de hoy
                                            </span>
                                        </label>

                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filtrosLocales.solo_esta_semana}
                                                onChange={() => handleCheckboxChange('solo_esta_semana')}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                Solo instalaciones de esta semana
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Filtros Rápidos de Fecha */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Rangos de Fecha Rápidos</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => {
                                                const hoy = obtenerFechaHoy();
                                                handleFilterChange('fecha_desde', hoy);
                                                handleFilterChange('fecha_hasta', hoy);
                                            }}
                                            className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                                        >
                                            Hoy
                                        </button>

                                        <button
                                            onClick={() => {
                                                const semana = obtenerFechaEstaSemana();
                                                handleFilterChange('fecha_desde', semana.inicio);
                                                handleFilterChange('fecha_hasta', semana.fin);
                                            }}
                                            className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                                        >
                                            Esta Semana
                                        </button>

                                        <button
                                            onClick={() => {
                                                const hoy = new Date();
                                                const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                                                const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
                                                handleFilterChange('fecha_desde', inicioMes.toISOString().split('T')[0]);
                                                handleFilterChange('fecha_hasta', finMes.toISOString().split('T')[0]);
                                            }}
                                            className="px-3 py-2 text-sm bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors"
                                        >
                                            Este Mes
                                        </button>

                                        <button
                                            onClick={() => {
                                                const hoy = new Date();
                                                const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
                                                const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
                                                handleFilterChange('fecha_desde', mesAnterior.toISOString().split('T')[0]);
                                                handleFilterChange('fecha_hasta', finMesAnterior.toISOString().split('T')[0]);
                                            }}
                                            className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Mes Anterior
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumen de Filtros Activos */}
                    {contarFiltrosActivos() > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Filtros Activos</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(filtrosLocales).map(([key, value]) => {
                                    if (!value || value === '' || value === false) return null;
                                    
                                    const labels = {
                                        busqueda: 'Búsqueda',
                                        estado: 'Estado',
                                        tipo_instalacion: 'Tipo',
                                        instalador_id: 'Instalador',
                                        ciudad_id: 'Ciudad',
                                        fecha_desde: 'Desde',
                                        fecha_hasta: 'Hasta',
                                        vencidas: 'Vencidas',
                                        solo_hoy: 'Solo Hoy',
                                        solo_esta_semana: 'Esta Semana',
                                        costo_minimo: 'Costo Mín',
                                        costo_maximo: 'Costo Máx'
                                    };

                                    const displayValue = typeof value === 'boolean' 
                                        ? (value ? 'Sí' : 'No')
                                        : value;

                                    return (
                                        <span
                                            key={key}
                                            className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                                        >
                                            {labels[key]}: {displayValue}
                                            <button
                                                onClick={() => handleFilterChange(key, 
                                                    typeof value === 'boolean' ? false : ''
                                                )}
                                                className="ml-2 text-blue-600 hover:text-blue-800"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            {contarFiltrosActivos()} filtro(s) activo(s)
                        </div>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={limpiarFiltros}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Limpiar Todo
                            </button>
                            
                            <button
                                onClick={onCerrar}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            
                            <button
                                onClick={aplicarFiltros}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstalacionesFilters;