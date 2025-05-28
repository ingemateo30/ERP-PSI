// frontend/src/components/Config/CompanyConfig.js

import React, { useState, useEffect } from 'react';
import {
  Building2, Save, RefreshCw, AlertCircle, CheckCircle,
  Loader2, ArrowLeft, Eye, EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configService from '../../services/configService';

const CompanyConfig = () => {
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
    porcentaje_interes: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Verificar permisos
  useEffect(() => {
    if (!hasPermission('administrador')) {
      navigate('/dashboard');
      return;
    }
  }, [hasPermission, navigate]);

  // Cargar configuración inicial
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await configService.getCompanyConfig();
      if (response.data && response.data.config) {
        setConfig(response.data.config);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
      setError(err.message);
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
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await configService.updateCompanyConfig(config);
      
      setSuccess(true);
      setIsDirty(false);
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadConfig();
    setIsDirty(false);
    setError(null);
    setSuccess(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/config')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuración de Empresa
                </h1>
                <p className="text-gray-600">
                  Configura los datos básicos de tu empresa
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isDirty && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <RefreshCw size={16} className="mr-2 inline" />
                  Descartar
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg flex items-center">
            <CheckCircle size={20} className="mr-2" />
            <span>Configuración guardada exitosamente</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <div>
              <p className="font-medium">Error guardando configuración</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Básica */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 size={20} className="mr-2 text-[#0e6493]" />
                Información Básica
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Licencia *
              </label>
              <input
                type="text"
                value={config.licencia}
                onChange={(e) => handleChange('licencia', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="Número de licencia"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={config.empresa_nombre}
                onChange={(e) => handleChange('empresa_nombre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="Nombre de la empresa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIT *
              </label>
              <input
                type="text"
                value={config.empresa_nit}
                onChange={(e) => handleChange('empresa_nit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="123456789-1"
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
                placeholder="+57 123 456 7890"
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

            {/* Configuración de Facturación */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración de Facturación
              </h3>
            </div>

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
                max="90"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje IVA (%)
              </label>
              <input
                type="number"
                value={config.porcentaje_iva}
                onChange={(e) => handleChange('porcentaje_iva', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="19"
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            {/* Configuración Avanzada */}
            <div className="md:col-span-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-[#0e6493] hover:text-[#0e6493]/80 transition-colors"
              >
                {showAdvanced ? <EyeOff size={16} /> : <Eye size={16} />}
                <span className="ml-2">
                  {showAdvanced ? 'Ocultar' : 'Mostrar'} configuración avanzada
                </span>
              </button>
            </div>

            {showAdvanced && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={config.empresa_departamento}
                    onChange={(e) => handleChange('empresa_departamento', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="Cundinamarca"
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolución de Facturación
                  </label>
                  <input
                    type="text"
                    value={config.resolucion_facturacion}
                    onChange={(e) => handleChange('resolucion_facturacion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="Resolución DIAN"
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
                    placeholder="Licencia para servicios de internet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vigilado por
                  </label>
                  <input
                    type="text"
                    value={config.vigilado}
                    onChange={(e) => handleChange('vigilado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="Superintendencia..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vigilado Internet
                  </label>
                  <input
                    type="text"
                    value={config.vigilado_internet}
                    onChange={(e) => handleChange('vigilado_internet', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="Vigilado servicios de internet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porcentaje Interés Mora (%)
                  </label>
                  <input
                    type="number"
                    value={config.porcentaje_interes}
                    onChange={(e) => handleChange('porcentaje_interes', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
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
              </>
            )}
          </div>

          {/* Footer del formulario */}
          <div className="mt-8 pt-6 border-t border-gray-200">
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