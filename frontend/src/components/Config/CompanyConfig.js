// frontend/src/components/Config/CompanyConfig.js
// ARCHIVO COMPLETO CORREGIDO - Configuración de Empresa con todos los campos

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Building2, FileText, Settings, Shield } from 'lucide-react';
import configService from '../../services/configService';

const CompanyConfig = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    licencia: '',
    empresa_nombre: '',
    empresa_nit: '',
    empresa_direccion: '',
    empresa_ciudad: '',
    empresa_departamento: '',
    empresa_telefono: '',
    empresa_email: '',
    resolucion_facturacion: '',
    licencia_internet: '',
    vigilado: '',
    vigilado_internet: '',
    comentario: '',
    prefijo_factura: 'FAC',
    codigo_gs1: '',
    valor_reconexion: 15000,
    dias_mora_corte: 30,
    porcentaje_iva: 19,
    porcentaje_interes: 0,
    prefijo_contrato: 'CONT',
    consecutivo_contrato: 1,
    consecutivo_orden: 1,
    prefijo_orden: 'ORD',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await configService.getCompanyConfig();
      
      if (response.data?.config) {
        // Fusionar configuración existente con valores por defecto
        setConfig(prevConfig => ({
          ...prevConfig,
          ...response.data.config
        }));
      }
      
      setError('');
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setError('Error al cargar la configuración de la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    const errors = [];

    if (!config.empresa_nombre?.trim()) {
      errors.push('El nombre de la empresa es requerido');
    }

    if (!config.empresa_nit?.trim()) {
      errors.push('El NIT de la empresa es requerido');
    }

    if (config.porcentaje_iva < 0 || config.porcentaje_iva > 100) {
      errors.push('El porcentaje de IVA debe estar entre 0 y 100');
    }

    if (config.dias_mora_corte < 1) {
      errors.push('Los días de mora deben ser mayor a 0');
    }

    if (config.valor_reconexion < 0) {
      errors.push('El valor de reconexión no puede ser negativo');
    }

    return errors;
  };

  const handleSave = async () => {
    try {
      const errors = validateForm();
      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      setSaving(true);
      setError('');

      // Limpiar datos antes de enviar
      const cleanConfig = { ...config };
      Object.keys(cleanConfig).forEach(key => {
        if (typeof cleanConfig[key] === 'string') {
          cleanConfig[key] = cleanConfig[key].trim();
        }
      });

      await configService.updateCompanyConfig(cleanConfig);
      
      setSuccess('Configuración guardada exitosamente');
      setIsDirty(false);
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error guardando configuración:', error);
      setError(error.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#0e6493]" />
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/config')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver a Configuración
          </button>
          
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-[#0e6493] mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Configuración de Empresa
              </h1>
              <p className="text-gray-600 mt-1">
                Configura los datos básicos de tu empresa y parámetros del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            
            {/* Información Básica de la Empresa */}
            <div className="flex items-center mb-6">
              <Building2 className="w-5 h-5 text-[#0e6493] mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Información Básica
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={config.empresa_nombre}
                  onChange={(e) => handleChange('empresa_nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Nombre completo de la empresa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIT/RUT *
                </label>
                <input
                  type="text"
                  value={config.empresa_nit}
                  onChange={(e) => handleChange('empresa_nit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="123456789-0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={config.empresa_telefono}
                  onChange={(e) => handleChange('empresa_telefono', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={config.empresa_email}
                  onChange={(e) => handleChange('empresa_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="contacto@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={config.empresa_ciudad}
                  onChange={(e) => handleChange('empresa_ciudad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Bogotá"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento
                </label>
                <input
                  type="text"
                  value={config.empresa_departamento}
                  onChange={(e) => handleChange('empresa_departamento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Santander"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <textarea
                  value={config.empresa_direccion}
                  onChange={(e) => handleChange('empresa_direccion', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Dirección completa de la empresa"
                />
              </div>
            </div>

            {/* Configuración de Facturación */}
            <div className="flex items-center mb-6">
              <FileText className="w-5 h-5 text-[#0e6493] mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Configuración de Facturación
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prefijo de Factura
                </label>
                <input
                  type="text"
                  value={config.prefijo_factura}
                  onChange={(e) => handleChange('prefijo_factura', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="FAC"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Reconexión ($)
                </label>
                <input
                  type="number"
                  value={config.valor_reconexion}
                  onChange={(e) => handleChange('valor_reconexion', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="15000"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días Mora para Corte
                </label>
                <input
                  type="number"
                  value={config.dias_mora_corte}
                  onChange={(e) => handleChange('dias_mora_corte', parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="30"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porcentaje IVA (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.porcentaje_iva}
                  onChange={(e) => handleChange('porcentaje_iva', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="19.00"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porcentaje Interés Mora (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.porcentaje_interes}
                  onChange={(e) => handleChange('porcentaje_interes', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                />
              </div>
            </div>

            {/* Configuración de Contratos y Órdenes */}
            <div className="flex items-center mb-6">
              <Settings className="w-5 h-5 text-[#0e6493] mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Contratos y Órdenes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prefijo Contratos
                </label>
                <input
                  type="text"
                  value={config.prefijo_contrato}
                  onChange={(e) => handleChange('prefijo_contrato', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="CONT"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prefijo Órdenes
                </label>
                <input
                  type="text"
                  value={config.prefijo_orden}
                  onChange={(e) => handleChange('prefijo_orden', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="ORD"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consecutivo Contratos
                </label>
                <input
                  type="number"
                  value={config.consecutivo_contrato}
                  onChange={(e) => handleChange('consecutivo_contrato', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="1"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consecutivo Órdenes
                </label>
                <input
                  type="number"
                  value={config.consecutivo_orden}
                  onChange={(e) => handleChange('consecutivo_orden', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>

            {/* Configuración Avanzada */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-[#0e6493] hover:text-[#0e6493]/80 mb-6"
              >
                <Shield className="w-5 h-5 mr-2" />
                <span className="font-medium">
                  {showAdvanced ? 'Ocultar' : 'Mostrar'} Configuración Regulatoria
                </span>
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Licencia
                    </label>
                    <input
                      type="text"
                      value={config.licencia}
                      onChange={(e) => handleChange('licencia', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="DEMO2025"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código GS1
                    </label>
                    <input
                      type="text"
                      value={config.codigo_gs1}
                      onChange={(e) => handleChange('codigo_gs1', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="Código GS1"
                      maxLength={20}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolución Facturación
                    </label>
                    <input
                      type="text"
                      value={config.resolucion_facturacion}
                      onChange={(e) => handleChange('resolucion_facturacion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="Pendiente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Licencia Internet
                    </label>
                    <input
                      type="text"
                      value={config.licencia_internet}
                      onChange={(e) => handleChange('licencia_internet', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="Pendiente"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vigilado Por
                    </label>
                    <textarea
                      value={config.vigilado}
                      onChange={(e) => handleChange('vigilado', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="Entidad que vigila la empresa"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vigilado Internet
                    </label>
                    <textarea
                      value={config.vigilado_internet}
                      onChange={(e) => handleChange('vigilado_internet', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="Entidad que vigila los servicios de internet"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comentarios Adicionales
                    </label>
                    <textarea
                      value={config.comentario}
                      onChange={(e) => handleChange('comentario', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="Comentarios o notas adicionales"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer del formulario */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                * Campos obligatorios
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/config')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyConfig;