// frontend/src/components/Inventory/EquipmentForm.js

import React, { useState, useEffect } from 'react';
import inventoryService from '../../services/inventoryService';
import { EQUIPMENT_TYPES } from '../../constants/inventoryConstants';

const EquipmentForm = ({ equipo, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    precio_compra: '',
    fecha_compra: '',
    proveedor: '',
    ubicacion: '',
    observaciones: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState(true);

  // Constantes locales como fallback
  const EQUIPMENT_TYPES = [
    { value: 'router', label: 'Router' },
    { value: 'decodificador', label: 'Decodificador' },
    { value: 'cable', label: 'Cable' },
    { value: 'antena', label: 'Antena' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'amplificador', label: 'Amplificador' },
    { value: 'otro', label: 'Otro' }
  ];

  // Obtener tipos del servicio con fallback
  const getEquipmentTypes = () => {
    try {
      return inventoryService.EQUIPMENT_TYPES || EQUIPMENT_TYPES;
    } catch (error) {
      console.warn('Error accediendo a EQUIPMENT_TYPES:', error);
      return EQUIPMENT_TYPES;
    }
  };

  // Cargar datos del equipo si es edición
  useEffect(() => {
    if (equipo) {
      setFormData({
        codigo: equipo.codigo || '',
        nombre: equipo.nombre || '',
        tipo: equipo.tipo || '',
        marca: equipo.marca || '',
        modelo: equipo.modelo || '',
        numero_serie: equipo.numero_serie || '',
        precio_compra: equipo.precio_compra || '',
        fecha_compra: equipo.fecha_compra ? equipo.fecha_compra.split('T')[0] : '',
        proveedor: equipo.proveedor || '',
        ubicacion: equipo.ubicacion || '',
        observaciones: equipo.observaciones || ''
      });
    }
  }, [equipo]);

  // Verificar disponibilidad del código
  const checkCodeAvailability = async (codigo) => {
    if (!codigo || codigo.length < 3) return;
    
    try {
      setCodeChecking(true);
      const response = await inventoryService.checkCodeAvailability(
        codigo.toUpperCase(),
        equipo?.id
      );
      setCodeAvailable(response.data.available);
      
      if (!response.data.available) {
        setErrors(prev => ({
          ...prev,
          codigo: 'Este código ya está en uso'
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.codigo;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error verificando código:', error);
    } finally {
      setCodeChecking(false);
    }
  };

  // Manejar cambios en los campos
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

    // Verificar código en tiempo real
    if (name === 'codigo') {
      const debounceTimer = setTimeout(() => {
        checkCodeAvailability(value);
      }, 500);
      
      return () => clearTimeout(debounceTimer);
    }
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es requerido';
    } else if (formData.codigo.length < 3) {
      newErrors.codigo = 'El código debe tener al menos 3 caracteres';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.codigo.toUpperCase())) {
      newErrors.codigo = 'El código solo puede contener letras, números, guiones y guiones bajos';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'El tipo es requerido';
    }

    if (formData.precio_compra && (isNaN(formData.precio_compra) || parseFloat(formData.precio_compra) < 0)) {
      newErrors.precio_compra = 'El precio debe ser un número positivo';
    }

    if (formData.fecha_compra && new Date(formData.fecha_compra) > new Date()) {
      newErrors.fecha_compra = 'La fecha de compra no puede ser futura';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || !codeAvailable) {
      return;
    }

    try {
      setLoading(true);
      
      const dataToSend = {
        ...formData,
        codigo: formData.codigo.toUpperCase().trim(),
        precio_compra: formData.precio_compra ? parseFloat(formData.precio_compra) : null
      };

      await onSubmit(dataToSend);
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {equipo ? 'Editar Equipo' : 'Nuevo Equipo'}
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.codigo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="RTR001"
                  maxLength="50"
                />
                {codeChecking && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {errors.codigo && (
                <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>
              )}
              {!codeAvailable && !errors.codigo && (
                <p className="mt-1 text-sm text-red-600">Este código ya está en uso</p>
              )}
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo *
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.tipo ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar tipo</option>
                {getEquipmentTypes().map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.tipo && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>
              )}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nombre ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Router WiFi AC1200"
              maxLength="255"
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TP-Link"
                maxLength="100"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo
              </label>
              <input
                type="text"
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Archer C6"
                maxLength="100"
              />
            </div>
          </div>

          {/* Número de serie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Serie
            </label>
            <input
              type="text"
              name="numero_serie"
              value={formData.numero_serie}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="TPL2024001"
              maxLength="100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Precio de compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio de Compra
              </label>
              <input
                type="number"
                name="precio_compra"
                value={formData.precio_compra}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.precio_compra ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="75000"
                min="0"
                step="0.01"
              />
              {errors.precio_compra && (
                <p className="mt-1 text-sm text-red-600">{errors.precio_compra}</p>
              )}
            </div>

            {/* Fecha de compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Compra
              </label>
              <input
                type="date"
                name="fecha_compra"
                value={formData.fecha_compra}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.fecha_compra ? 'border-red-500' : 'border-gray-300'
                }`}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.fecha_compra && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha_compra}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proveedor
              </label>
              <input
                type="text"
                name="proveedor"
                value={formData.proveedor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Distribuidora Tech"
                maxLength="255"
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación
              </label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Almacén Principal"
                maxLength="255"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales sobre el equipo..."
              maxLength="1000"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {formData.observaciones.length}/1000
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
              disabled={loading || !codeAvailable}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                equipo ? 'Actualizar' : 'Crear'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EquipmentForm;