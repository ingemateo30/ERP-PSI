// frontend/src/components/Inventory/AssignmentModal.js

import React, { useState, useEffect } from 'react';
import inventoryService from '../../services/inventoryService';

const AssignmentModal = ({ equipo, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    instalador_id: '',
    ubicacion: '',
    notas: ''
  });
  const [instaladores, setInstaladores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Cargar instaladores al montar el componente
  useEffect(() => {
    loadInstaladores();
  }, []);

  const loadInstaladores = async () => {
  try {
    console.log('🔄 Cargando instaladores...');
    const response = await inventoryService.getActiveInstallers();
    console.log('📥 Respuesta completa:', response);
    
    // Ahora response ES el objeto { success: true, message: [...] }
    let instaladoresList = [];
    
    if (response && response.success && response.message) {
      instaladoresList = response.message;
    } else if (response && Array.isArray(response)) {
      instaladoresList = response;
    }
    
    console.log('👥 Instaladores procesados:', instaladoresList);
    setInstaladores(instaladoresList);
    
  } catch (error) {
    console.error('❌ Error cargando instaladores:', error);
    setInstaladores([]);
  }
};

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.instalador_id) {
      newErrors.instalador_id = 'Debes seleccionar un instalador';
    }

    if (formData.ubicacion && formData.ubicacion.length > 255) {
      newErrors.ubicacion = 'La ubicación no puede exceder 255 caracteres';
    }

    if (formData.notas && formData.notas.length > 1000) {
      newErrors.notas = 'Las notas no pueden exceder 1000 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error en asignación:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Asignar Equipo a Instalador
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Información del equipo */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Equipo a asignar:</h4>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">
              {equipo.tipo === 'router' && '📡'}
              {equipo.tipo === 'decodificador' && '📺'}
              {equipo.tipo === 'cable' && '🔌'}
              {equipo.tipo === 'antena' && '📡'}
              {equipo.tipo === 'splitter' && '🔀'}
              {equipo.tipo === 'amplificador' && '🔊'}
              {!['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador'].includes(equipo.tipo) && '📦'}
            </span>
            <div>
              <div className="font-medium text-gray-900">{equipo.codigo}</div>
              <div className="text-sm text-gray-600">{equipo.nombre}</div>
              {equipo.marca && (
                <div className="text-xs text-gray-500">
                  {equipo.marca} {equipo.modelo && `- ${equipo.modelo}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de instalador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instalador *
            </label>
            <select
              name="instalador_id"
              value={formData.instalador_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.instalador_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar instalador</option>
              {instaladores.map(instalador => (
                <option key={instalador.id} value={instalador.id}>
                  {instalador.nombre} ({instalador.equipos_asignados} equipos asignados)
                </option>
              ))}
            </select>
            {errors.instalador_id && (
              <p className="mt-1 text-sm text-red-600">{errors.instalador_id}</p>
            )}
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación de entrega
            </label>
            <input
              type="text"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.ubicacion ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: Oficina principal, Almacén, etc."
              maxLength="255"
            />
            {errors.ubicacion && (
              <p className="mt-1 text-sm text-red-600">{errors.ubicacion}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas o instrucciones
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows="3"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.notas ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Instrucciones especiales, observaciones, etc."
              maxLength="1000"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.notas.length}/1000
            </div>
            {errors.notas && (
              <p className="mt-1 text-sm text-red-600">{errors.notas}</p>
            )}
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Información importante
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>El equipo cambiará de estado "disponible" a "asignado"</li>
                    <li>Se registrará la fecha y hora de asignación</li>
                    <li>El instalador podrá ver este equipo en su lista personal</li>
                    <li>Se creará un registro en el historial del equipo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.instalador_id}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Asignando...
                </>
              ) : (
                'Asignar Equipo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentModal;