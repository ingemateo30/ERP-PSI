// frontend/src/components/Clients/ClientForm.js - VERSIÓN CORREGIDA

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, MapPin, Phone, Globe, Calendar, Settings } from 'lucide-react';
import { clientService } from '../../services/clientService';
import { useConfig } from '../../hooks/useConfig';

const ClientForm = ({ client, onClose, onSave, permissions }) => {
  // Estados del formulario
  const [formData, setFormData] = useState({
    identificacion: '',
    tipo_documento: 'cedula',
    nombre: '',
    direccion: '',
    barrio: '',
    estrato: '',
    ciudad_id: '',
    sector_id: '',
    telefono: '',
    telefono_2: '',
    email: '',
    fecha_registro: new Date().toISOString().split('T')[0],
    fecha_inicio_servicio: '',
    fecha_fin_servicio: '',
    estado: 'activo',
    mac_address: '',
    ip_asignada: '',
    tap: '',
    puerto: '',
    numero_contrato: '',
    ruta: '',
    codigo_usuario: '',
    observaciones: '',
    requiere_reconexion: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // CORRECCIÓN: Obtener datos de configuración y sectores filtrados
  const { 
    cities, 
    sectors: allSectors, 
    loading: configLoading 
  } = useConfig();

  // NUEVO: Estado para sectores filtrados por ciudad
  const [availableSectors, setAvailableSectors] = useState([]);

  // Cargar datos del cliente si es edición
  useEffect(() => {
    if (client) {
      setFormData({
        identificacion: client.identificacion || '',
        tipo_documento: client.tipo_documento || 'cedula',
        nombre: client.nombre || '',
        direccion: client.direccion || '',
        barrio: client.barrio || '',
        estrato: client.estrato || '',
        ciudad_id: client.ciudad_id || '',
        sector_id: client.sector_id || '',
        telefono: client.telefono || '',
        telefono_2: client.telefono_2 || '',
        email: client.email || '',
        fecha_registro: client.fecha_registro || new Date().toISOString().split('T')[0],
        fecha_inicio_servicio: client.fecha_inicio_servicio || '',
        fecha_fin_servicio: client.fecha_fin_servicio || '',
        estado: client.estado || 'activo',
        mac_address: client.mac_address || '',
        ip_asignada: client.ip_asignada || '',
        tap: client.tap || '',
        puerto: client.puerto || '',
        numero_contrato: client.numero_contrato || '',
        ruta: client.ruta || '',
        codigo_usuario: client.codigo_usuario || '',
        observaciones: client.observaciones || '',
        requiere_reconexion: Boolean(client.requiere_reconexion)
      });
    }
  }, [client]);

  // CORRECCIÓN: Filtrar sectores cuando cambie la ciudad
  useEffect(() => {
    if (formData.ciudad_id && allSectors.length > 0) {
      const sectoresFiltrados = allSectors.filter(
        sector => sector.ciudad_id === parseInt(formData.ciudad_id)
      );
      setAvailableSectors(sectoresFiltrados);
      
      // Si el sector actual no pertenece a la ciudad seleccionada, limpiarlo
      if (formData.sector_id) {
        const sectorActualValido = sectoresFiltrados.some(
          sector => sector.id === parseInt(formData.sector_id)
        );
        
        if (!sectorActualValido) {
          console.log('🔄 Sector no válido para la ciudad seleccionada, limpiando...');
          setFormData(prev => ({ ...prev, sector_id: '' }));
          
          // Limpiar error de sector si existe
          if (errors.sector_id) {
            setErrors(prev => ({ ...prev, sector_id: null }));
          }
        }
      }
    } else {
      setAvailableSectors([]);
      // Limpiar sector si no hay ciudad seleccionada
      if (formData.sector_id) {
        setFormData(prev => ({ ...prev, sector_id: '' }));
      }
    }
  }, [formData.ciudad_id, allSectors]);

  // Manejar cambios en los campos
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let finalValue = value;
    
    // Manejar campos específicos
    if (type === 'checkbox') {
      finalValue = checked;
    } else if (name === 'ciudad_id') {
      // CORRECCIÓN: Limpiar sector cuando cambie la ciudad
      setFormData(prev => ({
        ...prev,
        [name]: finalValue,
        sector_id: '' // Limpiar sector al cambiar ciudad
      }));
      
      // Limpiar errores relacionados
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
      }
      if (errors.sector_id) {
        setErrors(prev => ({ ...prev, sector_id: null }));
      }
      
      return; // Salir temprano para evitar el setFormData de abajo
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    // Validaciones básicas
    if (!formData.identificacion.trim()) {
      newErrors.identificacion = 'La identificación es requerida';
    } else if (formData.identificacion.length < 5) {
      newErrors.identificacion = 'La identificación debe tener al menos 5 caracteres';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es requerida';
    } else if (formData.direccion.length < 5) {
      newErrors.direccion = 'La dirección debe tener al menos 5 caracteres';
    }

    // CORRECCIÓN: Validar sincronización ciudad-sector
    if (formData.sector_id && !formData.ciudad_id) {
      newErrors.ciudad_id = 'Debe seleccionar una ciudad antes de seleccionar un sector';
    }

    if (formData.ciudad_id && formData.sector_id) {
      const sectorValido = availableSectors.some(
        sector => sector.id === parseInt(formData.sector_id)
      );
      
      if (!sectorValido) {
        newErrors.sector_id = 'El sector seleccionado no pertenece a la ciudad';
      }
    }

    // Validar email si se proporciona
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'El formato del email no es válido';
      }
    }

    // Validar teléfono
    if (formData.telefono && formData.telefono.trim()) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(formData.telefono)) {
        newErrors.telefono = 'El formato del teléfono no es válido';
      }
    }

    // Validar fechas
    if (formData.fecha_inicio_servicio && formData.fecha_fin_servicio) {
      if (new Date(formData.fecha_fin_servicio) <= new Date(formData.fecha_inicio_servicio)) {
        newErrors.fecha_fin_servicio = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('❌ Formulario inválido:', errors);
      return;
    }

    setSaving(true);
    
    try {
      console.log('💾 Guardando cliente:', formData);

      let response;
      if (client?.id) {
        response = await clientService.updateClient(client.id, formData);
      } else {
        response = await clientService.createClient(formData);
      }

      if (response.success) {
        console.log('✅ Cliente guardado exitosamente');
        
        // Mostrar notificación de éxito
        if (window.showNotification) {
          window.showNotification('success', response.message || 'Cliente guardado exitosamente');
        }
        
        onSave(response.data);
      } else {
        throw new Error(response.message || 'Error al guardar cliente');
      }

    } catch (error) {
      console.error('❌ Error guardando cliente:', error);
      
      // Mostrar notificación de error
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al guardar cliente');
      } else {
        alert(error.message || 'Error al guardar cliente');
      }
    } finally {
      setSaving(false);
    }
  };

  // Cerrar modal
  const handleClose = () => {
    if (saving) return; // No permitir cerrar mientras se guarda
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {client ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {client ? 'Modifica la información del cliente' : 'Ingresa los datos del nuevo cliente'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido del formulario */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Información Personal */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Información Personal
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    name="tipo_documento"
                    value={formData.tipo_documento}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cedula">Cédula de Ciudadanía</option>
                    <option value="nit">NIT</option>
                    <option value="pasaporte">Pasaporte</option>
                    <option value="extranjeria">Cédula de Extranjería</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identificación *
                  </label>
                  <input
                    type="text"
                    name="identificacion"
                    value={formData.identificacion}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.identificacion ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Número de identificación"
                  />
                  {errors.identificacion && (
                    <p className="mt-1 text-sm text-red-600">{errors.identificacion}</p>
                  )}
                </div>

                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="cortado">Cortado</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.nombre ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nombre completo del cliente"
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de Ubicación */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Ubicación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.direccion ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Dirección completa"
                  />
                  {errors.direccion && (
                    <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barrio
                  </label>
                  <input
                    type="text"
                    name="barrio"
                    value={formData.barrio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del barrio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estrato
                  </label>
                  <select
                    name="estrato"
                    value={formData.estrato}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar estrato</option>
                    <option value="1">Estrato 1</option>
                    <option value="2">Estrato 2</option>
                    <option value="3">Estrato 3</option>
                    <option value="4">Estrato 4</option>
                    <option value="5">Estrato 5</option>
                    <option value="6">Estrato 6</option>
                  </select>
                </div>

                {/* CORRECCIÓN: Ciudad con sincronización */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <select
                    name="ciudad_id"
                    value={formData.ciudad_id}
                    onChange={handleInputChange}
                    disabled={configLoading}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
                      errors.ciudad_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar ciudad</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.nombre} - {city.departamento_nombre}
                      </option>
                    ))}
                  </select>
                  {errors.ciudad_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.ciudad_id}</p>
                  )}
                </div>

                {/* CORRECCIÓN: Sector sincronizado con ciudad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sector
                  </label>
                  <select
                    name="sector_id"
                    value={formData.sector_id}
                    onChange={handleInputChange}
                    disabled={configLoading || !formData.ciudad_id || availableSectors.length === 0}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
                      errors.sector_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">
                      {!formData.ciudad_id 
                        ? 'Primero selecciona una ciudad' 
                        : availableSectors.length === 0 
                          ? 'No hay sectores disponibles' 
                          : 'Seleccionar sector'
                      }
                    </option>
                    {availableSectors.map(sector => (
                      <option key={sector.id} value={sector.id}>
                        {sector.codigo} - {sector.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.sector_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.sector_id}</p>
                  )}
                  {formData.ciudad_id && availableSectors.length === 0 && (
                    <p className="mt-1 text-sm text-yellow-600">
                      No hay sectores configurados para esta ciudad
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Contacto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Principal
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.telefono ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="3001234567"
                  />
                  {errors.telefono && (
                    <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Secundario
                  </label>
                  <input
                    type="tel"
                    name="telefono_2"
                    value={formData.telefono_2}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="6012345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="cliente@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fechas de Servicio */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Fechas de Servicio
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Registro
                  </label>
                  <input
                    type="date"
                    name="fecha_registro"
                    value={formData.fecha_registro}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio Servicio
                  </label>
                  <input
                    type="date"
                    name="fecha_inicio_servicio"
                    value={formData.fecha_inicio_servicio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin Servicio
                  </label>
                  <input
                    type="date"
                    name="fecha_fin_servicio"
                    value={formData.fecha_fin_servicio}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.fecha_fin_servicio ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.fecha_fin_servicio && (
                    <p className="mt-1 text-sm text-red-600">{errors.fecha_fin_servicio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información Técnica */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Información Técnica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    name="mac_address"
                    value={formData.mac_address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Asignada
                  </label>
                  <input
                    type="text"
                    name="ip_asignada"
                    value={formData.ip_asignada}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TAP
                  </label>
                  <input
                    type="text"
                    name="tap"
                    value={formData.tap}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="TAP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puerto
                  </label>
                  <input
                    type="text"
                    name="puerto"
                    value={formData.puerto}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="P-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Contrato
                  </label>
                  <input
                    type="text"
                    name="numero_contrato"
                    value={formData.numero_contrato}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CT-00001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruta
                  </label>
                  <input
                    type="text"
                    name="ruta"
                    value={formData.ruta}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="R001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Usuario
                  </label>
                  <input
                    type="text"
                    name="codigo_usuario"
                    value={formData.codigo_usuario}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="USR00001"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="requiere_reconexion"
                    checked={formData.requiere_reconexion}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Requiere Reconexión
                  </label>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Observaciones adicionales sobre el cliente..."
              />
            </div>

            {/* Errores generales */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Por favor corrige los siguientes errores:</span>
                </div>
                <ul className="text-sm text-red-600 space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || Object.keys(errors).length > 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Save className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {client ? 'Actualizar' : 'Crear'} Cliente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientForm;