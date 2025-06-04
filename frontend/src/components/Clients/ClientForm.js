import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import { useClientForm } from '../../hooks/useClients';
import { useConfig } from '../../hooks/useConfig';
import { clientService } from '../../services/clientService';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  CLIENT_STATES,
  CLIENT_STATE_LABELS,
  STRATOS
} from '../../constants/clientConstants';

const ClientForm = ({ client, onClose, onSave }) => {
  const isEditing = Boolean(client);
  const {
    formData,
    errors,
    loading,
    updateField,
    validateForm,
    resetForm,
    createClient,
    updateClient
  } = useClientForm(client);

  const { sectors, cities, loading: configLoading } = useConfig();
  const [saving, setSaving] = useState(false);
  const [validatingId, setValidatingId] = useState(false);
  const [idValidation, setIdValidation] = useState(null);

  // Validar identificación cuando cambie
  useEffect(() => {
    const validateIdentification = async () => {
      if (formData.identificacion && formData.identificacion.length >= 5) {
        // No validar si es la misma identificación del cliente que se está editando
        if (isEditing && formData.identificacion === client.identificacion) {
          setIdValidation(null);
          return;
        }

        setValidatingId(true);
        try {
          const response = await clientService.validateIdentification(formData.identificacion);
          if (response.success) {
            setIdValidation(response.data.existe ? 'exists' : 'available');
          }
        } catch (error) {
          console.error('Error validating ID:', error);
        } finally {
          setValidatingId(false);
        }
      } else {
        setIdValidation(null);
      }
    };

    const timeoutId = setTimeout(validateIdentification, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.identificacion, isEditing, client?.identificacion]);

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (idValidation === 'exists') {
      return;
    }

    setSaving(true);
    try {
      let response;
      if (isEditing) {
        response = await updateClient(client.id);
      } else {
        response = await createClient();
      }

      if (response.success) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setSaving(false);
    }
  };

  // Formatear teléfono mientras se escribe
  const handlePhoneChange = (field, value) => {
    const cleaned = value.replace(/\D/g, '');
    updateField(field, cleaned);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={formData.tipo_documento}
                    onChange={(e) => updateField('tipo_documento', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Identificación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identificación *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.identificacion}
                      onChange={(e) => updateField('identificacion', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.identificacion ? 'border-red-300' : 
                        idValidation === 'exists' ? 'border-red-300' :
                        idValidation === 'available' ? 'border-green-300' : 
                        'border-gray-300'
                      }`}
                      placeholder="Número de identificación"
                      required
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {validatingId && (
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      )}
                      {!validatingId && idValidation === 'available' && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {!validatingId && idValidation === 'exists' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {errors.identificacion && (
                    <p className="text-red-600 text-sm mt-1">{errors.identificacion}</p>
                  )}
                  {idValidation === 'exists' && (
                    <p className="text-red-600 text-sm mt-1">
                      Ya existe un cliente con esta identificación
                    </p>
                  )}
                </div>

                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => updateField('nombre', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.nombre ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nombre completo del cliente"
                    required
                  />
                  {errors.nombre && (
                    <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información de Contacto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teléfono principal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Principal
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handlePhoneChange('telefono', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.telefono ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="3001234567"
                    maxLength="10"
                  />
                  {errors.telefono && (
                    <p className="text-red-600 text-sm mt-1">{errors.telefono}</p>
                  )}
                </div>

                {/* Teléfono secundario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Secundario
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono_2}
                    onChange={(e) => handlePhoneChange('telefono_2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="6012345678"
                    maxLength="10"
                  />
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => updateField('correo', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.correo ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="cliente@email.com"
                  />
                  {errors.correo && (
                    <p className="text-red-600 text-sm mt-1">{errors.correo}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de ubicación */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información de Ubicación
              </h3>
              
              <div className="space-y-4">
                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => updateField('direccion', e.target.value)}
                    rows="2"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.direccion ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Dirección completa de instalación"
                    required
                  />
                  {errors.direccion && (
                    <p className="text-red-600 text-sm mt-1">{errors.direccion}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Ciudad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <select
                      value={formData.ciudad_id}
                      onChange={(e) => updateField('ciudad_id', e.target.value)}
                      disabled={configLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Seleccionar ciudad</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.nombre} ({city.departamento_nombre})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sector
                    </label>
                    <select
                      value={formData.sector_id}
                      onChange={(e) => updateField('sector_id', e.target.value)}
                      disabled={configLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Seleccionar sector</option>
                      {sectors.map((sector) => (
                        <option key={sector.id} value={sector.id}>
                          {sector.codigo} - {sector.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estrato */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estrato
                    </label>
                    <select
                      value={formData.estrato}
                      onChange={(e) => updateField('estrato', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar estrato</option>
                      {STRATOS.map((estrato) => (
                        <option key={estrato.value} value={estrato.value}>
                          {estrato.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Barrio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barrio
                  </label>
                  <input
                    type="text"
                    value={formData.barrio}
                    onChange={(e) => updateField('barrio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del barrio"
                  />
                </div>
              </div>
            </div>

            {/* Información técnica */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Información Técnica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => updateField('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(CLIENT_STATE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MAC Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección MAC
                  </label>
                  <input
                    type="text"
                    value={formData.mac_address}
                    onChange={(e) => updateField('mac_address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.mac_address ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                  {errors.mac_address && (
                    <p className="text-red-600 text-sm mt-1">{errors.mac_address}</p>
                  )}
                </div>

                {/* IP Asignada */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Asignada
                  </label>
                  <input
                    type="text"
                    value={formData.ip_asignada}
                    onChange={(e) => updateField('ip_asignada', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.ip_asignada ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="192.168.1.100"
                  />
                  {errors.ip_asignada && (
                    <p className="text-red-600 text-sm mt-1">{errors.ip_asignada}</p>
                  )}
                </div>

                {/* TAP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TAP
                  </label>
                  <input
                    type="text"
                    value={formData.tap}
                    onChange={(e) => updateField('tap', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="TAP001"
                  />
                </div>

                {/* Poste */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poste
                  </label>
                  <input
                    type="text"
                    value={formData.poste}
                    onChange={(e) => updateField('poste', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="P-001"
                  />
                </div>

                {/* Contrato */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Contrato
                  </label>
                  <input
                    type="text"
                    value={formData.contrato}
                    onChange={(e) => updateField('contrato', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CT-001"
                  />
                </div>

                {/* Ruta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruta
                  </label>
                  <input
                    type="text"
                    value={formData.ruta}
                    onChange={(e) => updateField('ruta', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="R001"
                  />
                </div>

                {/* Código de usuario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Usuario
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_usuario}
                    onChange={(e) => updateField('codigo_usuario', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="USR001"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => updateField('observaciones', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || loading || idValidation === 'exists'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Actualizar' : 'Crear'} Cliente
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientForm;