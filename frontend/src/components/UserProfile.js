import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Edit2, 
  Check, 
  X, 
  Save, 
  RefreshCw, 
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Phone,
  Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../services/apiService';

const UserProfile = () => {
  const { currentUser, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Estados para edición de perfil
  const [editData, setEditData] = useState({
    nombre: '',
    telefono: '',
    email: ''
  });

  // Estados para cambio de contraseña
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  // Inicializar datos cuando el usuario esté disponible
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 UserProfile - Usuario actualizado:', currentUser);
      setEditData({
        nombre: currentUser.nombre || '',
        telefono: currentUser.telefono || '',
        email: currentUser.email || ''
      });
    }
  }, [currentUser, refreshKey]);

  // Limpiar mensajes después de un tiempo
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <RefreshCw className="animate-spin h-5 w-5 text-[#0e6493] mr-3" />
            <p className="text-gray-600">Cargando información del usuario...</p>
          </div>
        </div>
      </div>
    );
  }

  // Manejar edición de perfil
  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      nombre: currentUser.nombre || '',
      telefono: currentUser.telefono || '',
      email: currentUser.email || ''
    });
    setError('');
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Validaciones básicas
      if (!editData.nombre.trim()) {
        setError('El nombre es requerido');
        return;
      }

      if (!editData.email.trim()) {
        setError('El email es requerido');
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editData.email)) {
        setError('El formato del email no es válido');
        return;
      }

      // Llamar al servicio para actualizar el perfil
      console.log('🔄 Actualizando perfil con datos:', editData);
      const response = await usersService.updateProfile(editData);

      if (response.success) {
        console.log('✅ Respuesta del servidor:', response);
        
        // Crear los datos actualizados combinando currentUser con editData
        const updatedUserData = {
          ...currentUser,
          ...editData,
          id: currentUser.id,
          rol: currentUser.rol,
          activo: currentUser.activo,
          ultimo_acceso: currentUser.ultimo_acceso,
          updated_at: new Date().toISOString()
        };
        
        console.log('📋 Datos completos para actualizar contexto:', updatedUserData);
        
        // Actualizar contexto de usuario
        await updateUser(updatedUserData);
        
        setEditData({
          nombre: updatedUserData.nombre,
          telefono: updatedUserData.telefono,
          email: updatedUserData.email
        });
        
        setRefreshKey(prev => prev + 1);
        setSuccess('Perfil actualizado exitosamente');
        setIsEditing(false);
        
        console.log('✅ Perfil actualizado exitosamente en frontend');
      } else {
        setError(response.message || 'Error al actualizar el perfil');
      }

    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      setError(error.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  // Manejar cambio de contraseña
  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePassword = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'La contraseña actual es requerida';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'La contraseña debe contener al menos una minúscula, una mayúscula y un número';
    }
    
    if (!passwordData.confirmNewPassword) {
      errors.confirmNewPassword = 'Confirma la nueva contraseña';
    } else if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      errors.confirmNewPassword = 'Las contraseñas no coinciden';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    try {
      if (!validatePassword()) {
        return;
      }

      setLoading(true);
      setError('');

      const response = await usersService.changeOwnPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword
      });

      if (response.success) {
        setSuccess('Contraseña cambiada exitosamente');
        setShowChangePassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        setPasswordErrors({});
      } else {
        setError(response.message || 'Error al cambiar la contraseña');
      }

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      setError(error.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const cancelPasswordChange = () => {
    setShowChangePassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setPasswordErrors({});
    setError('');
  };

  return (
    <div className="space-y-6">
      
      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3" />
            <p className="text-green-800 text-sm font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Información del Perfil */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0e6493] to-[#1a73a8] px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Información Personal</h2>
                <p className="text-blue-100 text-sm">Administra los datos de tu perfil</p>
              </div>
            </div>
            
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200 border border-white/30 text-sm font-medium"
              >
                <Edit2 className="h-4 w-4 mr-2 inline" />
                Editar
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2 inline" />
                  )}
                  Guardar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  <X className="h-4 w-4 mr-2 inline" />
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-2 text-[#0e6493]" />
                Nombre Completo
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493]/20 focus:border-[#0e6493] transition-colors"
                  placeholder="Ingresa tu nombre completo"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {currentUser?.nombre || editData.nombre || 'No especificado'}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-2 text-[#0e6493]" />
                Correo Electrónico
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493]/20 focus:border-[#0e6493] transition-colors"
                  placeholder="correo@ejemplo.com"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {currentUser?.email || editData.email}
                </div>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 inline mr-2 text-[#0e6493]" />
                Teléfono
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493]/20 focus:border-[#0e6493] transition-colors"
                  placeholder="Número de teléfono"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {currentUser?.telefono || editData.telefono || 'No especificado'}
                </div>
              )}
            </div>

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="h-4 w-4 inline mr-2 text-[#0e6493]" />
                Rol en el Sistema
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0e6493] text-white">
                  <Shield className="h-3 w-3 mr-1" />
                  {currentUser.rol || currentUser.role}
                </span>
              </div>
            </div>

            {/* Último acceso */}
            {currentUser.ultimo_acceso && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2 text-[#0e6493]" />
                  Último Acceso
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {new Date(currentUser.ultimo_acceso).toLocaleString('es-CO')}
                </div>
              </div>
            )}

            {/* ID de Usuario */}
            {currentUser.id && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="h-4 w-4 inline mr-2 text-[#0e6493]" />
                  ID de Usuario
                </label>
                <div className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  {currentUser.id}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Seguridad */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Seguridad de la Cuenta</h3>
              <p className="text-gray-300 text-sm">Administra la seguridad de tu cuenta</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!showChangePassword ? (
            <div className="space-y-4">
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-[#0e6493] hover:bg-[#0d5a84] text-white rounded-lg transition-colors duration-200 font-medium"
              >
                <Lock className="h-4 w-4 mr-2" />
                Cambiar Contraseña
              </button>
              
              {/* Indicadores de seguridad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Cuenta Activa</span>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">Autenticado</span>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-800">Datos Seguros</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-[#0e6493]" />
                  <h4 className="text-lg font-medium text-gray-900">Cambiar Contraseña</h4>
                </div>
                <button
                  onClick={cancelPasswordChange}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contraseña Actual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#0e6493]/20 focus:border-[#0e6493] transition-colors ${
                      passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                )}
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#0e6493]/20 focus:border-[#0e6493] transition-colors ${
                      passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 8 caracteres, una mayúscula, una minúscula y un número
                </p>
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmNewPassword}
                    onChange={(e) => handlePasswordChange('confirmNewPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#0e6493]/20 focus:border-[#0e6493] transition-colors ${
                      passwordErrors.confirmNewPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirmar nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmNewPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmNewPassword}</p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 bg-[#0e6493] hover:bg-[#0d5a84] text-white rounded-lg transition-colors duration-200 disabled:opacity-50 font-medium"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Cambiar Contraseña
                </button>
                <button
                  onClick={cancelPasswordChange}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
                     