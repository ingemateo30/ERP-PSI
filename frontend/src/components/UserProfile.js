// frontend/src/components/UserProfile.js - ACTUALIZADO CON MAINLAYOUT

import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, Edit2, Check, X, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
    const { currentUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState({
        nombre: currentUser?.nombre || '',
        telefono: currentUser?.telefono || '',
        email: currentUser?.email || ''
    });

    if (!currentUser) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-500 text-center">No hay información de usuario disponible</p>
            </div>
        );
    }

    const handleEdit = () => {
        setIsEditing(true);
        setEditData({
            nombre: currentUser.nombre || '',
            telefono: currentUser.telefono || '',
            email: currentUser.email || ''
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditData({
            nombre: currentUser.nombre || '',
            telefono: currentUser.telefono || '',
            email: currentUser.email || ''
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Aquí implementarías la lógica para actualizar el perfil
            console.log('Guardando datos:', editData);
            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsEditing(false);
        } catch (error) {
            console.error('Error guardando perfil:', error);
            alert('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
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
            case 'administrador':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'supervisor':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'instalador':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRoleLabel = (role) => {
        switch (role?.toLowerCase()) {
            case 'administrador':
                return 'Administrador';
            case 'supervisor':
                return 'Supervisor';
            case 'instalador':
                return 'Instalador';
            default:
                return role || 'Usuario';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <User size={32} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {currentUser.nombre || 'Usuario'}
                                </h1>
                                <p className="text-blue-100">{currentUser.email}</p>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mt-2 ${getRoleColor(currentUser.role || currentUser.rol)}`}>
                                    <Shield size={14} className="mr-1" />
                                    {getRoleLabel(currentUser.role || currentUser.rol)}
                                </span>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            {!isEditing ? (
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center px-4 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
                                >
                                    <Edit2 size={16} className="mr-2" />
                                    Editar Perfil
                                </button>
                            ) : (
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center px-4 py-2 bg-green-500 rounded-lg text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                        ) : (
                                            <Save size={16} className="mr-2" />
                                        )}
                                        {saving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={saving}
                                        className="flex items-center px-4 py-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                                    >
                                        <X size={16} className="mr-2" />
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información Personal */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                            <User size={20} className="mr-2 text-[#0e6493]" />
                            Información Personal
                        </h3>

                        <div className="space-y-6">
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre Completo
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editData.nombre}
                                        onChange={(e) => setEditData(prev => ({ ...prev, nombre: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                        placeholder="Ingresa tu nombre completo"
                                    />
                                ) : (
                                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                                        {currentUser.nombre || 'No especificado'}
                                    </div>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Correo Electrónico
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 flex items-center">
                                    <Mail size={16} className="mr-2 text-gray-400" />
                                    {currentUser.email}
                                    <span className="ml-auto text-xs text-gray-500">No editable</span>
                                </div>
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Teléfono
                                </label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={editData.telefono}
                                        onChange={(e) => setEditData(prev => ({ ...prev, telefono: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                                        placeholder="Ingresa tu número de teléfono"
                                    />
                                ) : (
                                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                                        {currentUser.telefono || 'No especificado'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Información del Sistema */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                            <Shield size={20} className="mr-2 text-[#0e6493]" />
                            Información del Sistema
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rol del Usuario
                                </label>
                                <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border w-full ${getRoleColor(currentUser.role || currentUser.rol)}`}>
                                    <Shield size={16} className="mr-2" />
                                    {getRoleLabel(currentUser.role || currentUser.rol)}
                                </span>
                            </div>

                            {currentUser.ultimo_acceso && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Último Acceso
                                    </label>
                                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg flex items-center">
                                        <Calendar size={16} className="mr-2 text-gray-400" />
                                        {new Date(currentUser.ultimo_acceso).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            )}

                            {currentUser.created_at && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Miembro Desde
                                    </label>
                                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                        {new Date(currentUser.created_at).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                            )}

                            {currentUser.id && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ID de Usuario
                                    </label>
                                    <div className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-2 rounded-lg">
                                        {currentUser.id}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Acciones de Seguridad */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">
                            Seguridad de la Cuenta
                        </h3>

                        <div className="space-y-3">
                            <button
                                onClick={() => alert('Cambio de contraseña en desarrollo')}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                            >
                                Cambiar Contraseña
                            </button>

                            <button
                                onClick={() => alert('Sesiones activas en desarrollo')}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                            >
                                Ver Sesiones Activas
                            </button>

                            <button
                                onClick={() => alert('Configuración de notificaciones en desarrollo')}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                            >
                                Configurar Notificaciones
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estadísticas de Actividad */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Estadísticas de Actividad
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-[#0e6493]">
                            {Math.floor(Math.random() * 50) + 10}
                        </div>
                        <div className="text-sm text-gray-600">Sesiones este mes</div>
                    </div>

                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {Math.floor(Math.random() * 100) + 20}
                        </div>
                        <div className="text-sm text-gray-600">Acciones realizadas</div>
                    </div>

                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                            {Math.floor(Math.random() * 24) + 1}h
                        </div>
                        <div className="text-sm text-gray-600">Tiempo total conectado</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;