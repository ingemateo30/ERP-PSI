// frontend/src/components/Config/BanksConfig.js

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Search, ArrowLeft, Loader2, AlertCircle, CheckCircle, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configService from '../../services/configService';

const BanksConfig = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [formData, setFormData] = useState({ codigo: '', nombre: '' });
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Verificar permisos
  useEffect(() => {
    if (!hasPermission('administrador')) {
      navigate('/dashboard');
      return;
    }
  }, [hasPermission, navigate]);

  // Cargar bancos
  useEffect(() => {
    loadBanks();
  }, []);

  // FUNCIÓN CORREGIDA - Manejo seguro de la respuesta de la API
  const loadBanks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await configService.getBanks();
      // Manejo seguro de diferentes estructuras de respuesta
      let banksData = [];
      
      if (response && response.message && Array.isArray(response.message)) {
        banksData = response.message;
        console.log('✅ Usando response.message como array');
      } else if (response && response.data && Array.isArray(response.data)) {
        banksData = response.data;
        console.log('✅ Usando response.data como array');
      } else if (response && response.data && response.data.banks && Array.isArray(response.data.banks)) {
        banksData = response.data.banks;
        console.log('✅ Usando response.data.banks como array');
      } else if (Array.isArray(response)) {
        banksData = response;
        console.log('✅ Usando response directamente como array');
      } else if (response && response.banks && Array.isArray(response.banks)) {
        banksData = response.banks;
        console.log('✅ Usando response.banks como array');
      } else {
        console.log('❌ No se encontró estructura de array válida');
        console.log('❌ Estructura de respuesta:', response);
      }
      
      console.log('📈 Datos finales de bancos:', banksData);
      console.log('🔢 Cantidad de bancos:', banksData.length);
      
      // Verificación final de seguridad
      if (!Array.isArray(banksData)) {
        console.error('❌ Estructura de respuesta inesperada:', response);
        banksData = [];
      }
      
      setBanks(banksData);
    } catch (err) {
      console.error('❌ Error cargando bancos:', err);
      console.error('❌ Error completo:', err.response || err);
      setError(err.message);
      setBanks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingBank(null);
    setFormData({ codigo: '', nombre: '' });
    setShowModal(true);
  };

  const handleEdit = (bank) => {
    setEditingBank(bank);
    setFormData({ codigo: bank.codigo, nombre: bank.nombre });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingBank) {
        await configService.updateBank(editingBank.id, formData);
        setBanks(prev => Array.isArray(prev) ? prev.map(bank => 
          bank.id === editingBank.id 
            ? { ...bank, ...formData }
            : bank
        ) : []);
      } else {
        const response = await configService.createBank(formData);
        // CORRECCIÓN: Manejar la estructura de respuesta para nuevos bancos
        let newBank;
        if (response && response.message && typeof response.message === 'object') {
          newBank = response.message;
        } else if (response && response.data && typeof response.data === 'object') {
          newBank = response.data;
        } else {
          newBank = response;
        }
        
        setBanks(prev => Array.isArray(prev) ? [newBank, ...prev] : [newBank]);
      }
      
      setShowModal(false);
      setFormData({ codigo: '', nombre: '', activo: true });
      setEditingBank(null);
      
    } catch (err) {
      console.error('Error guardando banco:', err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (bank) => {
    try {
      await configService.toggleBank(bank.id);
      setBanks(prev => Array.isArray(prev) ? prev.map(b => 
        b.id === bank.id 
          ? { ...b, activo: !b.activo }
          : b
      ) : []);
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert(err.message);
    }
  };

  const handleDelete = async (bank) => {
    if (!window.confirm(`¿Estás seguro de eliminar el banco "${bank.nombre}"?`)) {
      return;
    }

    try {
      await configService.deleteBank(bank.id);
      setBanks(prev => Array.isArray(prev) ? prev.filter(b => b.id !== bank.id) : []);
    } catch (err) {
      console.error('Error eliminando banco:', err);
      alert(err.message);
    }
  };

  // FILTRADO SEGURO - Verificación de que banks sea un array y manejo seguro de propiedades
  const filteredBanks = Array.isArray(banks) 
    ? banks.filter(bank => {
        // Verificar que el banco y sus propiedades existan
        if (!bank) return false;
        
        const nombre = bank.nombre || '';
        const codigo = bank.codigo || '';
        const searchLower = searchTerm.toLowerCase();
        
        return nombre.toLowerCase().includes(searchLower) ||
               codigo.toLowerCase().includes(searchLower);
      })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
          <p className="text-gray-600">Cargando bancos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
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
                  Gestión de Bancos
                </h1>
                <p className="text-gray-600">
                  Administra los bancos para registro de pagos
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Nuevo Banco
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <div>
              <p className="font-medium">Error cargando bancos</p>
              <p className="text-sm">{error}</p>
            </div>
            <button 
              onClick={loadBanks}
              className="ml-auto p-1 hover:bg-red-200 rounded"
            >
              <Loader2 size={16} />
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar bancos por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Bancos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanks.map((bank) => (
            <div
              key={bank.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                bank.activo 
                  ? 'border-green-500 hover:shadow-lg' 
                  : 'border-gray-400 opacity-75'
              } transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    bank.activo ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <CreditCard size={20} className={
                      bank.activo ? 'text-[#0e6493]' : 'text-gray-500'
                    } />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{bank.nombre || 'Sin nombre'}</h3>
                    <p className="text-sm text-gray-500">Código: {bank.codigo || 'Sin código'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleStatus(bank)}
                    className={`p-1 rounded transition-colors ${
                      bank.activo 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={bank.activo ? 'Desactivar' : 'Activar'}
                  >
                    {bank.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(bank)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(bank)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    bank.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {bank.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pagos:</span>
                  <span className="font-medium">{bank.total_pagos || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredBanks.length === 0 && !loading && (
          <div className="text-center py-12">
            <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron bancos' : 'No hay bancos configurados'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Comienza agregando tu primer banco'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
              >
                Agregar Banco
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBank ? 'Editar Banco' : 'Nuevo Banco'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código del Banco *
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="001"
                  maxLength={5}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Banco *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Banco de Bogotá"
                  maxLength={100}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.codigo.trim() || !formData.nombre.trim()}
                  className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="mr-2" />
                      {editingBank ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BanksConfig;