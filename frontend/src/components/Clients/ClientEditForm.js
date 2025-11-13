// =============================================
// FRONTEND: frontend/src/components/Clients/ClientEditForm.js - SOLUCIÓN CORREGIDA
// =============================================

import React, { useState, useEffect } from 'react';
import {
  X, Save, Loader2, User, MapPin, Phone, Mail,
  AlertCircle, Check
} from 'lucide-react';
import { clientService } from '../../services/clientService';

const ClientEditForm = ({ client, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [sectores, setSectores] = useState([]);
  const [ciudades, setCiudades] = useState([]);

  // Estado del formulario - SOLO campos editables
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    telefono_fijo: '',
    correo: '',
    barrio: '',
    estrato: '3',
    ciudad_id: '',
    sector_id: '',
    observaciones: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
    if (client) {
      cargarDatosCliente();
    }
  }, [client]);

  // Recargar sectores cuando cambie la ciudad
  useEffect(() => {
    if (formData.ciudad_id) {
      cargarSectoresPorCiudad(formData.ciudad_id);
    }
  }, [formData.ciudad_id]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      const [ciudadesResponse, sectoresResponse] = await Promise.all([
        clientService.getCiudades(),
        clientService.getSectores()
      ]);

      if (ciudadesResponse.success) {
        setCiudades(ciudadesResponse.data);
      }

      if (sectoresResponse.success) {
        setSectores(sectoresResponse.data);
      }

    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      setErrors({
        general: 'Error cargando datos. Refresque la página.'
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarSectoresPorCiudad = async (ciudadId) => {
    try {
      const response = await clientService.getSectoresPorCiudad(ciudadId);
      if (response.success) {
        setSectores(response.data);
      }
    } catch (error) {
      console.error('❌ Error cargando sectores:', error);
    }
  };

  const cargarDatosCliente = () => {
    if (!client) return;

    setFormData({
      nombre: client.nombre || '',
      direccion: client.direccion || '',
      telefono: client.telefono || '',
      telefono_fijo: client.telefono_2 || '',
      correo: client.correo || '',
      barrio: client.barrio || '',
      estrato: client.estrato || '3',
      ciudad_id: client.ciudad_id || '',
      sector_id: client.sector_id || '',
      observaciones: client.observaciones || ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es requerido';
    }

    if (!formData.direccion.trim()) {
      nuevosErrores.direccion = 'La dirección es requerida';
    }

    if (!formData.telefono.trim()) {
      nuevosErrores.telefono = 'El teléfono es requerido';
    } else if (!/^[0-9]{10}$/.test(formData.telefono.replace(/\s/g, ''))) {
      nuevosErrores.telefono = 'El teléfono debe tener 10 dígitos';
    }

    if (formData.correo && !/\S+@\S+\.\S+/.test(formData.correo)) {
      nuevosErrores.correo = 'El email no tiene un formato válido';
    }

    if (formData.telefono_fijo && !/^[0-9]{7,10}$/.test(formData.telefono_fijo.replace(/\s/g, ''))) {
      nuevosErrores.telefono_fijo = 'El teléfono fijo debe tener entre 7 y 10 dígitos';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      console.log('📝 Actualizando cliente:', client.id, formData);

      // SOLUCIÓN: Incluir la identificación del cliente en los datos de actualización
      // porque el backend la requiere para validación
      const datosActualizacion = {
        ...formData,
        identificacion: client.identificacion, // ⭐ ESTA ES LA LÍNEA QUE SOLUCIONA EL ERROR
        ciudad_id: formData.ciudad_id ? parseInt(formData.ciudad_id) : null,
        sector_id: formData.sector_id ? parseInt(formData.sector_id) : null
      };

      const response = await clientService.updateClient(client.id, datosActualizacion);

      if (response.success) {
        console.log('✅ Cliente actualizado exitosamente');
        
        // Mostrar notificación de éxito
        if (window.showNotification) {
          window.showNotification('success', 'Cliente actualizado exitosamente');
        }
        
        onSave && onSave(response.data);
        onClose();
      } else {
        throw new Error(response.message || 'Error al actualizar cliente');
      }

    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      setErrors({ 
        general: error.message || 'Error al actualizar el cliente' 
      });
      
      // Mostrar notificación de error
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al actualizar cliente');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Cargando datos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0e6493] to-[#0a5273]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-6 h-6" />
              Editar Cliente
            </h2>
            <p className="text-sm text-white/90 mt-1">
              {client.identificacion} - {client.nombre}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm font-medium">
                Solo campos editables
              </span>
              <span className="text-xs text-white/75">
                La identificación no se puede cambiar
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error general */}
        {errors.general && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-1 text-sm text-red-600">{errors.general}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            
            {/* Información Personal */}
            <div>
              <h3 className="text-lg font-semibold text-[#0e6493] mb-4 flex items-center gap-2 border-b-2 border-[#0e6493]/20 pb-3">
                <User className="w-5 h-5" />
                Información Personal
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] ${
                      errors.nombre ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nombre completo del cliente"
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => handleInputChange('correo', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] ${
                      errors.correo ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="correo@example.com"
                  />
                  {errors.correo && (
                    <p className="mt-1 text-sm text-red-600">{errors.correo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Celular *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] ${
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
                    Teléfono Fijo
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono_fijo}
                    onChange={(e) => handleInputChange('telefono_fijo', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] ${
                      errors.telefono_fijo ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="6012345678"
                  />
                  {errors.telefono_fijo && (
                    <p className="mt-1 text-sm text-red-600">{errors.telefono_fijo}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de Ubicación */}
            <div>
              <h3 className="text-lg font-semibold text-[#0e6493] mb-4 flex items-center gap-2 border-b-2 border-[#0e6493]/20 pb-3">
                <MapPin className="w-5 h-5" />
                Ubicación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] ${
                      errors.direccion ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Dirección completa del cliente"
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
                    value={formData.barrio}
                    onChange={(e) => handleInputChange('barrio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                    placeholder="Nombre del barrio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estrato
                  </label>
                  <select
                    value={formData.estrato}
                    onChange={(e) => handleInputChange('estrato', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                  >
                    <option value="1">Estrato 1</option>
                    <option value="2">Estrato 2</option>
                    <option value="3">Estrato 3</option>
                    <option value="4">Estrato 4</option>
                    <option value="5">Estrato 5</option>
                    <option value="6">Estrato 6</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <select
                    value={formData.ciudad_id}
                    onChange={(e) => handleInputChange('ciudad_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                  >
                    <option value="">Seleccionar ciudad</option>
                    {ciudades.map(ciudad => (
                      <option key={ciudad.id} value={ciudad.id}>
                        {ciudad.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sector
                  </label>
                  <select
                    value={formData.sector_id}
                    onChange={(e) => handleInputChange('sector_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                    disabled={!formData.ciudad_id}
                  >
                    <option value="">Seleccionar sector</option>
                    {sectores.map(sector => (
                      <option key={sector.id} value={sector.id}>
                        {sector.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                placeholder="Observaciones adicionales sobre el cliente..."
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t-2 border-gray-200 mt-8 bg-gray-50 p-6 -mx-6 -mb-6 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-all shadow-sm hover:shadow"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#0e6493] to-[#0a5273] text-white rounded-lg hover:from-[#0a5273] hover:to-[#0e6493] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Actualizar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientEditForm;