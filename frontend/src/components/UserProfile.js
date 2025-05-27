// frontend/src/components/UserProfile.js
import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LogoutButton from './LogoutButton';

const UserProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">No hay información de usuario disponible</p>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      name: user.name || '',
      email: user.email || ''
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: user.name || '',
      email: user.email || ''
    });
  };

  const handleSave = () => {
    // Aquí implementarías la lógica para actualizar el perfil
    console.log('Guardando datos:', editData);
    setIsEditing(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No disponible';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header del perfil */}
      <div className="bg-gradient-to-r from-[#0e6493] to-[#1a7ba8] px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {user.name || 'Usuario'}
              </h1>
              <p className="text-blue-100">Perfil de usuario</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
                title="Editar perfil"
              >
                <Edit2 size={20} />
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="p-2 bg-green-500 rounded-lg text-white hover:bg-green-600 transition-colors"
                  title="Guardar cambios"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                  title="Cancelar"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido del perfil */}
      <div className="p-6 space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <User size={16} className="mr-2" />
              Nombre
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="Ingresa tu nombre"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {user.name || 'No especificado'}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Mail size={16} className="mr-2" />
              Correo Electrónico
            </label>
            {isEditing ? (
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="tu.correo@ejemplo.com"
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Información del sistema */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rol */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Shield size={16} className="mr-2" />
                Rol
              </label>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                {user.role || 'user'}
              </span>
            </div>

            {/* Última actividad */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Calendar size={16} className="mr-2" />
                Token expira
              </label>
              <p className="text-gray-600 text-sm bg-gray-50 px-3 py-2 rounded-lg">
                {formatDate(user.exp)}
              </p>
            </div>
          </div>
        </div>

        {/* ID de usuario (solo para debug/admin) */}
        {user.id && (
          <div className="border-t pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                ID de Usuario
              </label>
              <p className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-2 rounded-lg">
                {user.id}
              </p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="border-t pt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Gestiona tu cuenta y configuración
          </div>
          <LogoutButton variant="outline" />
        </div>
      </div>
    </div>
  );
};

export default UserProfile;