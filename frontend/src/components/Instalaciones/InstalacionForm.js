// frontend/src/components/Instalaciones/InstalacionForm.js

import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    Calendar,
    MapPin,
    User,
    Phone,
    Clock,
    AlertCircle,
    Plus,
    Minus,
    Search,
    Loader2
} from 'lucide-react';

const InstalacionForm = ({
    instalacion,
    onClose,
    onSave,
    permissions
}) => {
    // Estado del formulario
    const [formData, setFormData] = useState({
        cliente_id: '',
        plan_id: '',
        instalador_id: '',
        fecha_programada: '',
        direccion_instalacion: '',
        barrio: '',
        ciudad_id: '',
        telefono_contacto: '',
        persona_recibe: '',
        tipo_instalacion: 'nueva',
        observaciones: '',
        coordenadas_lat: '',
        coordenadas_lng: '',
        costo_instalacion: '',
        equipos_instalados: []
    });

    // Estados para datos auxiliares
    const [clientes, setClientes] = useState([]);
    const [planes, setPlanes] = useState([]);
    const [instaladores, setInstaladores] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [equipos, setEquipos] = useState([]);

    // Estados de control
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [errors, setErrors] = useState({});
    const [searchCliente, setSearchCliente] = useState('');
    const [showClienteSearch, setShowClienteSearch] = useState(false);

    // Cargar datos iniciales
    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    // Cargar datos del formulario si es edición
    useEffect(() => {
        if (instalacion) {
            setFormData({
                cliente_id: instalacion.cliente_id || '',
                plan_id: instalacion.plan_id || '',
                instalador_id: instalacion.instalador_id || '',
                fecha_programada: instalacion.fecha_programada ?
                    new Date(instalacion.fecha_programada).toISOString().slice(0, 16) : '',
                direccion_instalacion: instalacion.direccion_instalacion || '',
                barrio: instalacion.barrio || '',
                ciudad_id: instalacion.ciudad_id || '',
                telefono_contacto: instalacion.telefono_contacto || '',
                persona_recibe: instalacion.persona_recibe || '',
                tipo_instalacion: instalacion.tipo_instalacion || 'nueva',
                observaciones: instalacion.observaciones || '',
                coordenadas_lat: instalacion.coordenadas_lat || '',
                coordenadas_lng: instalacion.coordenadas_lng || '',
                costo_instalacion: instalacion.costo_instalacion || '',
                equipos_instalados: instalacion.equipos_instalados || []
            });
        }
    }, [instalacion]);

    // Cargar datos auxiliares
    const cargarDatosIniciales = async () => {
        setLoadingData(true);
        try {
            // Aquí harías las llamadas reales a la API
            // Por ahora simulamos datos
            setClientes([
                { id: 1, numero_documento: '12345678', nombres: 'Juan', apellidos: 'Pérez', email: 'juan@email.com' },
                { id: 2, numero_documento: '87654321', nombres: 'María', apellidos: 'González', email: 'maria@email.com' }
            ]);

            setPlanes([
                { id: 1, nombre: 'Plan Básico 10MB', precio: 45000 },
                { id: 2, nombre: 'Plan Premium 50MB', precio: 85000 },
                { id: 3, nombre: 'Plan Ultra 100MB', precio: 120000 }
            ]);

            setInstaladores([
                { id: 1, nombres: 'Carlos', apellidos: 'Rodríguez', activo: true },
                { id: 2, nombres: 'Ana', apellidos: 'López', activo: true },
                { id: 3, nombres: 'Luis', apellidos: 'Martínez', activo: true }
            ]);

            setCiudades([
                { id: 1, nombre: 'Bogotá' },
                { id: 2, nombre: 'Medellín' },
                { id: 3, nombre: 'Cali' },
                { id: 4, nombre: 'Barranquilla' }
            ]);

            setEquipos([
                { id: 1, codigo: 'RT001', nombre: 'Router TP-Link AC1200', tipo: 'router' },
                { id: 2, codigo: 'DEC001', nombre: 'Decodificador HD', tipo: 'decodificador' },
                { id: 3, codigo: 'CAB001', nombre: 'Cable Coaxial 50m', tipo: 'cable' }
            ]);

        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoadingData(false);
        }
    };

    // Manejar cambios en el formulario
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Limpiar error del campo
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Agregar equipo instalado
    const agregarEquipo = () => {
        setFormData(prev => ({
            ...prev,
            equipos_instalados: [
                ...prev.equipos_instalados,
                {
                    equipo_id: '',
                    cantidad: 1,
                    numero_serie: '',
                    observaciones: ''
                }
            ]
        }));
    };

    // Remover equipo instalado
    const removerEquipo = (index) => {
        setFormData(prev => ({
            ...prev,
            equipos_instalados: prev.equipos_instalados.filter((_, i) => i !== index)
        }));
    };

    // Actualizar equipo instalado
    const actualizarEquipo = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            equipos_instalados: prev.equipos_instalados.map((equipo, i) =>
                i === index ? { ...equipo, [field]: value } : equipo
            )
        }));
    };

    // Validar formulario
    const validarFormulario = () => {
        const nuevosErrores = {};

        if (!formData.cliente_id) {
            nuevosErrores.cliente_id = 'El cliente es requerido';
        }

        if (!formData.plan_id) {
            nuevosErrores.plan_id = 'El plan de servicio es requerido';
        }

        if (!formData.fecha_programada) {
            nuevosErrores.fecha_programada = 'La fecha programada es requerida';
        }

        if (!formData.direccion_instalacion.trim()) {
            nuevosErrores.direccion_instalacion = 'La dirección es requerida';
        }

        if (!formData.ciudad_id) {
            nuevosErrores.ciudad_id = 'La ciudad es requerida';
        }

        if (!formData.telefono_contacto.trim()) {
            nuevosErrores.telefono_contacto = 'El teléfono de contacto es requerido';
        }

        if (formData.costo_instalacion && isNaN(formData.costo_instalacion)) {
            nuevosErrores.costo_instalacion = 'El costo debe ser un número válido';
        }

        setErrors(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    // Manejar envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        setLoading(true);
        try {
            const datosParaEnviar = {
                ...formData,
                costo_instalacion: formData.costo_instalacion ? parseFloat(formData.costo_instalacion) : null,
                coordenadas_lat: formData.coordenadas_lat ? parseFloat(formData.coordenadas_lat) : null,
                coordenadas_lng: formData.coordenadas_lng ? parseFloat(formData.coordenadas_lng) : null
            };

            await onSave(datosParaEnviar);
            onClose();
        } catch (error) {
            console.error('Error guardando instalación:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar clientes por búsqueda
    const clientesFiltrados = clientes.filter(cliente =>
        cliente.numero_documento.includes(searchCliente) ||
        `${cliente.nombres} ${cliente.apellidos}`.toLowerCase().includes(searchCliente.toLowerCase()) ||
        cliente.email.toLowerCase().includes(searchCliente.toLowerCase())
    );

    if (loadingData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    <p className="mt-2 text-center">Cargando datos del formulario...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0e6493] to-[#0a5273]">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Wrench className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {instalacion ? 'Editar Instalación' : 'Nueva Instalación'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/10 transition-colors p-2 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">

                        {/* Información del Cliente */}
                        <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
                            <h3 className="text-lg font-semibold text-[#0e6493] mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Información del Cliente
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Selector de Cliente */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <User className="w-4 h-4 inline mr-1" />
                                        Cliente *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente por documento, nombre o email..."
                                            value={searchCliente}
                                            onChange={(e) => {
                                                setSearchCliente(e.target.value);
                                                setShowClienteSearch(true);
                                            }}
                                            onFocus={() => setShowClienteSearch(true)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent ${errors.cliente_id ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        />
                                        <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />

                                        {/* Lista de clientes */}
                                        {showClienteSearch && searchCliente && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {clientesFiltrados.length > 0 ? (
                                                    clientesFiltrados.map(cliente => (
                                                        <button
                                                            key={cliente.id}
                                                            type="button"
                                                            onClick={() => {
                                                                handleInputChange('cliente_id', cliente.id);
                                                                setSearchCliente(`${cliente.nombres} ${cliente.apellidos} - ${cliente.numero_documento}`);
                                                                setShowClienteSearch(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
                                                        >
                                                            <div className="font-medium">{cliente.nombres} {cliente.apellidos}</div>
                                                            <div className="text-sm text-gray-600">{cliente.numero_documento} - {cliente.email}</div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-gray-500 text-center">No se encontraron clientes</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {errors.cliente_id && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {errors.cliente_id}
                                        </p>
                                    )}
                                </div>

                                {/* Plan de Servicio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Plan de Servicio *
                                    </label>
                                    <select
                                        value={formData.plan_id}
                                        onChange={(e) => handleInputChange('plan_id', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent ${errors.plan_id ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    >
                                        <option value="">Seleccionar plan</option>
                                        {planes.map(plan => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.nombre} - ${plan.precio.toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.plan_id && (
                                        <p className="mt-1 text-sm text-red-600">{errors.plan_id}</p>
                                    )}
                                </div>

                                {/* Tipo de Instalación */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipo de Instalación *
                                    </label>
                                    <select
                                        value={formData.tipo_instalacion}
                                        onChange={(e) => handleInputChange('tipo_instalacion', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                    >
                                        <option value="nueva">Nueva Instalación</option>
                                        <option value="migracion">Migración</option>
                                        <option value="upgrade">Upgrade</option>
                                        <option value="reparacion">Reparación</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Información de la Instalación */}
                        <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
                            <h3 className="text-lg font-semibold text-[#0e6493] mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Detalles de Instalación
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Fecha Programada */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Fecha y Hora Programada *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.fecha_programada}
                                        onChange={(e) => handleInputChange('fecha_programada', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent ${errors.fecha_programada ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.fecha_programada && (
                                        <p className="mt-1 text-sm text-red-600">{errors.fecha_programada}</p>
                                    )}
                                </div>

                                {/* Instalador */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <User className="w-4 h-4 inline mr-1" />
                                        Instalador Asignado
                                    </label>
                                    <select
                                        value={formData.instalador_id}
                                        onChange={(e) => handleInputChange('instalador_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                    >
                                        <option value="">Sin asignar</option>
                                        {instaladores.filter(inst => inst.activo).map(instalador => (
                                            <option key={instalador.id} value={instalador.id}>
                                                {instalador.nombres} {instalador.apellidos}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dirección */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <MapPin className="w-4 h-4 inline mr-1" />
                                        Dirección de Instalación *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Calle 123 #45-67"
                                        value={formData.direccion_instalacion}
                                        onChange={(e) => handleInputChange('direccion_instalacion', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent ${errors.direccion_instalacion ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.direccion_instalacion && (
                                        <p className="mt-1 text-sm text-red-600">{errors.direccion_instalacion}</p>
                                    )}
                                </div>

                                {/* Barrio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Barrio
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del barrio"
                                        value={formData.barrio}
                                        onChange={(e) => handleInputChange('barrio', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                    />
                                </div>

                                {/* Ciudad */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ciudad *
                                    </label>
                                    <select
                                        value={formData.ciudad_id}
                                        onChange={(e) => handleInputChange('ciudad_id', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent ${errors.ciudad_id ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    >
                                        <option value="">Seleccionar ciudad</option>
                                        {ciudades.map(ciudad => (
                                            <option key={ciudad.id} value={ciudad.id}>
                                                {ciudad.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.ciudad_id && (
                                        <p className="mt-1 text-sm text-red-600">{errors.ciudad_id}</p>
                                    )}
                                </div>

                                {/* Teléfono de Contacto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Phone className="w-4 h-4 inline mr-1" />
                                        Teléfono de Contacto *
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="Ej: 3001234567"
                                        value={formData.telefono_contacto}
                                        onChange={(e) => handleInputChange('telefono_contacto', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent ${errors.telefono_contacto ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.telefono_contacto && (
                                        <p className="mt-1 text-sm text-red-600">{errors.telefono_contacto}</p>
                                    )}
                                </div>

                                {/* Persona que Recibe */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Persona que Recibe
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nombre de quien recibe"
                                        value={formData.persona_recibe}
                                        onChange={(e) => handleInputChange('persona_recibe', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Coordenadas GPS */}
                        <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
                            <h3 className="text-lg font-semibold text-[#0e6493] mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Coordenadas GPS (Opcional)
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Latitud
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Ej: 4.6097102"
                                        value={formData.coordenadas_lat}
                                        onChange={(e) => handleInputChange('coordenadas_lat', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Longitud
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Ej: -74.0817413"
                                        value={formData.coordenadas_lng}
                                        onChange={(e) => handleInputChange('coordenadas_lng', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Equipos Instalados */}
                        <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-[#0e6493] flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Equipos a Instalar
                                </h3>
                                <button
                                    type="button"
                                    onClick={agregarEquipo}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0e6493] to-[#0a5273] text-white rounded-lg hover:from-[#0a5273] hover:to-[#0e6493] transition-all shadow-md font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Equipo
                                </button>
                            </div>

                            {formData.equipos_instalados.length > 0 ? (
                                <div className="space-y-3">
                                    {formData.equipos_instalados.map((equipo, index) => (
                                        <div key={index} className="bg-white p-4 rounded-lg border-2 border-gray-200">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Equipo
                                                    </label>
                                                    <select
                                                        value={equipo.equipo_id}
                                                        onChange={(e) => actualizarEquipo(index, 'equipo_id', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                                    >
                                                        <option value="">Seleccionar equipo</option>
                                                        {equipos.map(eq => (
                                                            <option key={eq.id} value={eq.id}>
                                                                {eq.codigo} - {eq.nombre}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Cantidad
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={equipo.cantidad}
                                                        onChange={(e) => actualizarEquipo(index, 'cantidad', parseInt(e.target.value) || 1)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Número de Serie
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Serie del equipo"
                                                        value={equipo.numero_serie}
                                                        onChange={(e) => actualizarEquipo(index, 'numero_serie', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                                    />
                                                </div>

                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removerEquipo(index)}
                                                        className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Observaciones del equipo */}
                                            <div className="mt-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Observaciones del Equipo
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Observaciones específicas..."
                                                    value={equipo.observaciones}
                                                    onChange={(e) => actualizarEquipo(index, 'observaciones', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No hay equipos agregados</p>
                                    <p className="text-sm">Haz clic en "Agregar Equipo" para comenzar</p>
                                </div>
                            )}
                        </div>

                        {/* Información Adicional */}
                        <div className="bg-gray-50 p-5 rounded-lg border-2 border-gray-200">
                            <h3 className="text-lg font-semibold text-[#0e6493] mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Información Adicional
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Observaciones */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Observaciones
                                    </label>
                                    <textarea
                                        rows="4"
                                        placeholder="Observaciones generales de la instalación..."
                                        value={formData.observaciones}
                                        onChange={(e) => handleInputChange('observaciones', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer con botones */}
                    <div className="flex items-center justify-end gap-4 p-6 border-t-2 border-gray-200 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-all shadow-sm hover:shadow"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 font-medium text-white bg-gradient-to-r from-[#0e6493] to-[#0a5273] rounded-lg hover:from-[#0a5273] hover:to-[#0e6493] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {loading ? 'Guardando...' : (instalacion ? 'Actualizar' : 'Crear Instalación')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InstalacionForm;