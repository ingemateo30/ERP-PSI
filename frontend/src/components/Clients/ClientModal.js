// frontend/src/components/Clients/ClientModal.js - VERSIÓN CORREGIDA

import React, { useState } from 'react';
import { 
  X, Edit, Trash2, Phone, Mail, MapPin, Calendar, 
  User, CreditCard, Wifi, Settings, AlertTriangle,
  CheckCircle, Clock, XCircle
} from 'lucide-react';
import { clientService } from '../../services/clientService';

const ClientModal = ({ client, onClose, onEdit, onDelete, permissions }) => {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Función para formatear fechas
  const formatDate = (dateString) => {
  if (!dateString) return 'No especificada';

  try {
    // Separar fecha y hora
    const [datePart] = dateString.split(' ');
    const [year, month, day] = datePart.split('-');
    // Crear fecha en local usando solo año, mes y día
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};

  // Función para formatear teléfonos
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Función para obtener el color del estado
  const getStateColor = (state) => {
    const colors = {
      'activo': 'bg-green-100 text-green-800 border-green-200',
      'suspendido': 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      'cortado': 'bg-red-100 text-red-800 border-red-200',
      'inactivo': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[state] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Función para obtener el icono del estado
  const getStateIcon = (state) => {
    const icons = {
      'activo': CheckCircle,
      'suspendido': Clock,
      'cortado': XCircle,
      'inactivo': AlertTriangle
    };
    const IconComponent = icons[state] || AlertTriangle;
    return <IconComponent className="w-4 h-4" />;
  };

  // Manejar eliminación
  const handleDelete = async () => {
    if (!permissions.canDelete) {
      alert('No tienes permisos para eliminar clientes');
      return;
    }

    setDeleting(true);
    
    try {
      const response = await clientService.deleteClient(client.id);
      
      if (response.success) {
        // Mostrar notificación de éxito
        if (window.showNotification) {
          window.showNotification('success', response.message || 'Cliente eliminado exitosamente');
        }
        
        onDelete();
        onClose();
      } else {
        throw new Error(response.message || 'Error al eliminar cliente');
      }
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      
      // Mostrar notificación de error
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al eliminar cliente');
      } else {
        alert(error.message || 'Error al eliminar cliente');
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{client.nombre}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-600">
                  {client.tipo_documento === 'cedula' ? 'CC' : 
                   client.tipo_documento === 'nit' ? 'NIT' : 
                   client.tipo_documento?.toUpperCase()} {client.identificacion}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStateColor(client.estado)}`}>
                  {getStateIcon(client.estado)}
                  {client.estado?.charAt(0).toUpperCase() + client.estado?.slice(1)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {permissions.canEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            )}
            
            {permissions.canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Información Personal */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Información Personal
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Nombre Completo</p>
                  <p className="text-sm font-medium text-gray-900">{client.nombre}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Documento</p>
                    <p className="text-sm font-medium text-gray-900">
                      {client.tipo_documento === 'cedula' ? 'Cédula de Ciudadanía' : 
                       client.tipo_documento === 'nit' ? 'NIT' : 
                       client.tipo_documento === 'pasaporte' ? 'Pasaporte' : 
                       client.tipo_documento === 'extranjeria' ? 'Cédula de Extranjería' :
                       client.tipo_documento}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Identificación</p>
                    <p className="text-sm font-medium text-gray-900">{client.identificacion}</p>
                  </div>
                </div>

                {client.estrato && (
                  <div>
                    <p className="text-sm text-gray-500">Estrato</p>
                    <p className="text-sm font-medium text-gray-900">Estrato {client.estrato}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Contacto
              </h3>

              <div className="space-y-3">
                {client.telefono && (
                  <div>
                    <p className="text-sm text-gray-500">Teléfono Principal</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPhone(client.telefono)}
                      </p>
                      <a 
                        href={`tel:${client.telefono}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {client.telefono_2 && (
                  <div>
                    <p className="text-sm text-gray-500">Teléfono Secundario</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPhone(client.telefono_2)}
                      </p>
                      <a 
                        href={`tel:${client.telefono_2}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {client.email && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{client.email}</p>
                      <a 
                        href={`mailto:${client.email}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Ubicación
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Dirección</p>
                  <p className="text-sm font-medium text-gray-900">{client.direccion}</p>
                </div>

                {client.barrio && (
                  <div>
                    <p className="text-sm text-gray-500">Barrio</p>
                    <p className="text-sm font-medium text-gray-900">{client.barrio}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {client.sector_nombre && (
                    <div>
                      <p className="text-sm text-gray-500">Sector</p>
                      <p className="text-sm font-medium text-gray-900">
                        {client.sector_codigo} - {client.sector_nombre}
                      </p>
                    </div>
                  )}

                  {client.estrato && (
                    <div>
                      <p className="text-sm text-gray-500">Estrato</p>
                      <p className="text-sm font-medium text-gray-900">
                        Estrato {client.estrato}
                      </p>
                    </div>
                  )}
                </div>

                {client.ciudad_nombre && (
                  <div>
                    <p className="text-sm text-gray-500">Ciudad</p>
                    <p className="text-sm font-medium text-gray-900">
                      {client.ciudad_nombre}
                      {client.departamento_nombre && ` - ${client.departamento_nombre}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CORRECCIÓN: Información Técnica Completa */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Información Técnica
              </h3>

              <div className="space-y-3">
                {/* Conectividad */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Conectividad
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">MAC Address</p>
                      <p className="font-medium text-gray-900">
                        {client.mac_address || 'No asignada'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">IP Asignada</p>
                      <p className="font-medium text-gray-900">
                        {client.ip_asignada || 'No asignada'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Infraestructura Física */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Infraestructura Física
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">TAP</p>
                      <p className="font-medium text-gray-900">
                        {client.tap || 'No asignado'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Puerto</p>
                      <p className="font-medium text-gray-900">
                        {client.puerto || 'No asignado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información Contractual */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Información Contractual
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Número de Contrato</p>
                      <p className="font-medium text-gray-900">
                        {client.numero_contrato || 'No asignado'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Código de Usuario</p>
                      <p className="font-medium text-gray-900">
                        {client.codigo_usuario || 'No asignado'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Ruta</p>
                      <p className="font-medium text-gray-900">
                        {client.ruta || 'No asignada'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-500">Requiere Reconexión</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          client.requiere_reconexion ? 'bg-red-500' : 'bg-green-500'
                        }`}></div>
                        <p className="font-medium text-gray-900">
                          {client.requiere_reconexion ? 'Sí' : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fechas de Servicio */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Fechas de Servicio
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Fecha de Registro</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(client.fecha_registro)}
                  </p>
                </div>

                {client.fecha_inicio_servicio && (
                  <div>
                    <p className="text-sm text-gray-500">Inicio de Servicio</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(client.fecha_inicio_servicio)}
                    </p>
                  </div>
                )}

                {client.fecha_fin_servicio && (
                  <div>
                    <p className="text-sm text-gray-500">Fin de Servicio</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(client.fecha_fin_servicio)}
                    </p>
                  </div>
                )}

                {/* Fechas de Sistema */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
                    <div>
                      <p>Creado</p>
                      <p>{client.created_at ? formatDate(client.created_at) : 'No disponible'}</p>
                    </div>
                    <div>
                      <p>Última Actualización</p>
                      <p>{client.updated_at ? formatDate(client.updated_at) : 'No disponible'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            {client.observaciones && (
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Observaciones
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {client.observaciones}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar Eliminación
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">
                  ¿Estás seguro de que deseas eliminar al cliente <strong>{client.nombre}</strong>?
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Esto eliminará toda la información asociada al cliente.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Eliminar Cliente
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientModal;