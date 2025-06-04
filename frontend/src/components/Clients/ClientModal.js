import React, { useState } from 'react';
import { 
  X, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  Hash,
  Wifi,
  Globe,
  Router,
  AlertTriangle
} from 'lucide-react';
import { CLIENT_STATE_LABELS, CLIENT_STATE_COLORS, DOCUMENT_TYPE_LABELS } from '../../constants/clientConstants';
import { clientService } from '../../services/clientService';

const ClientModal = ({ client, onClose, onEdit, onDelete, permissions }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Función para obtener el color del estado
  const getStateColor = (state) => {
    const colorClass = CLIENT_STATE_COLORS[state] || 'gray';
    return {
      'green': 'bg-green-100 text-green-800 border-green-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'red': 'bg-red-100 text-red-800 border-red-200',
      'gray': 'bg-gray-100 text-gray-800 border-gray-200',
      'slate': 'bg-slate-100 text-slate-800 border-slate-200'
    }[colorClass];
  };

  // Formatear teléfono
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      return `+57 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    } else if (cleaned.length === 10) {
      return `+57 ${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4)}`;
    }
    return phone;
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Manejar eliminación
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await clientService.deleteClient(client.id);
      if (response.success) {
        onDelete();
        onClose();
      } else {
        alert(response.message || 'Error al eliminar cliente');
      }
    } catch (error) {
      alert('Error al eliminar cliente');
      console.error('Error deleting client:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {client.nombre}
              </h2>
              <p className="text-gray-600">
                {DOCUMENT_TYPE_LABELS[client.tipo_documento] || 'Documento'}: {client.identificacion}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {permissions.canEdit && onEdit && (
              <button
                onClick={() => onEdit(client)}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            )}
            
            {permissions.canDelete && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="space-y-6">
            {/* Estado del cliente */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Estado del Cliente</h3>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStateColor(client.estado)}`}>
                    {CLIENT_STATE_LABELS[client.estado] || client.estado}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Fecha de Registro</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(client.fecha_registro || client.created_at)}
                </p>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  Información de Contacto
                </h3>
                
                <div className="space-y-3">
                  {client.telefono && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Teléfono Principal</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatPhone(client.telefono)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {client.telefono_2 && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Teléfono Secundario</p>
                       <p className="text-sm font-medium text-gray-900">
                         {formatPhone(client.telefono_2)}
                       </p>
                     </div>
                   </div>
                 )}
                 
                 {client.correo && (
                   <div className="flex items-center space-x-3">
                     <Mail className="w-4 h-4 text-gray-400" />
                     <div>
                       <p className="text-sm text-gray-500">Correo Electrónico</p>
                       <p className="text-sm font-medium text-gray-900">
                         {client.correo}
                       </p>
                     </div>
                   </div>
                 )}
               </div>
             </div>

             <div>
               <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                 <MapPin className="w-5 h-5 text-blue-600" />
                 Ubicación
               </h3>
               
               <div className="space-y-3">
                 <div>
                   <p className="text-sm text-gray-500">Dirección</p>
                   <p className="text-sm font-medium text-gray-900">
                     {client.direccion}
                   </p>
                 </div>
                 
                 {client.barrio && (
                   <div>
                     <p className="text-sm text-gray-500">Barrio</p>
                     <p className="text-sm font-medium text-gray-900">
                       {client.barrio}
                     </p>
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
           </div>

           {/* Información técnica */}
           <div>
             <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
               <Router className="w-5 h-5 text-blue-600" />
               Información Técnica
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {client.mac_address && (
                 <div className="bg-gray-50 p-3 rounded-lg">
                   <div className="flex items-center space-x-2 mb-1">
                     <Wifi className="w-4 h-4 text-gray-400" />
                     <p className="text-sm text-gray-500">MAC Address</p>
                   </div>
                   <p className="text-sm font-mono font-medium text-gray-900">
                     {client.mac_address}
                   </p>
                 </div>
               )}
               
               {client.ip_asignada && (
                 <div className="bg-gray-50 p-3 rounded-lg">
                   <div className="flex items-center space-x-2 mb-1">
                     <Globe className="w-4 h-4 text-gray-400" />
                     <p className="text-sm text-gray-500">IP Asignada</p>
                   </div>
                   <p className="text-sm font-mono font-medium text-gray-900">
                     {client.ip_asignada}
                   </p>
                 </div>
               )}
               
               {client.tap && (
                 <div className="bg-gray-50 p-3 rounded-lg">
                   <div className="flex items-center space-x-2 mb-1">
                     <Hash className="w-4 h-4 text-gray-400" />
                     <p className="text-sm text-gray-500">TAP</p>
                   </div>
                   <p className="text-sm font-medium text-gray-900">
                     {client.tap}
                   </p>
                 </div>
               )}
               
               {client.poste && (
                 <div className="bg-gray-50 p-3 rounded-lg">
                   <div className="flex items-center space-x-2 mb-1">
                     <Hash className="w-4 h-4 text-gray-400" />
                     <p className="text-sm text-gray-500">Poste</p>
                   </div>
                   <p className="text-sm font-medium text-gray-900">
                     {client.poste}
                   </p>
                 </div>
               )}
               
               {client.contrato && (
                 <div className="bg-gray-50 p-3 rounded-lg">
                   <div className="flex items-center space-x-2 mb-1">
                     <Hash className="w-4 h-4 text-gray-400" />
                     <p className="text-sm text-gray-500">Contrato</p>
                   </div>
                   <p className="text-sm font-medium text-gray-900">
                     {client.contrato}
                   </p>
                 </div>
               )}
               
               {client.ruta && (
                 <div className="bg-gray-50 p-3 rounded-lg">
                   <div className="flex items-center space-x-2 mb-1">
                     <Hash className="w-4 h-4 text-gray-400" />
                     <p className="text-sm text-gray-500">Ruta</p>
                   </div>
                   <p className="text-sm font-medium text-gray-900">
                     {client.ruta}
                   </p>
                 </div>
               )}
             </div>
           </div>

           {/* Código de usuario */}
           {client.codigo_usuario && (
             <div className="bg-blue-50 p-4 rounded-lg">
               <h4 className="text-sm font-medium text-blue-900 mb-1">Código de Usuario</h4>
               <p className="text-lg font-mono font-bold text-blue-700">
                 {client.codigo_usuario}
               </p>
             </div>
           )}

           {/* Observaciones */}
           {client.observaciones && (
             <div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">Observaciones</h3>
               <div className="bg-gray-50 p-4 rounded-lg">
                 <p className="text-sm text-gray-700 whitespace-pre-wrap">
                   {client.observaciones}
                 </p>
               </div>
             </div>
           )}

           {/* Fechas importantes */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-gray-50 p-4 rounded-lg">
               <div className="flex items-center space-x-2 mb-2">
                 <Calendar className="w-4 h-4 text-gray-400" />
                 <h4 className="text-sm font-medium text-gray-700">Fecha de Registro</h4>
               </div>
               <p className="text-sm text-gray-900">
                 {formatDate(client.fecha_registro || client.created_at)}
               </p>
             </div>
             
             {client.fecha_hasta && (
               <div className="bg-gray-50 p-4 rounded-lg">
                 <div className="flex items-center space-x-2 mb-2">
                   <Calendar className="w-4 h-4 text-gray-400" />
                   <h4 className="text-sm font-medium text-gray-700">Fecha Hasta</h4>
                 </div>
                 <p className="text-sm text-gray-900">
                   {formatDate(client.fecha_hasta)}
                 </p>
               </div>
             )}
           </div>

           {/* Indicador de reconexión */}
           {client.requiere_reconexion && (
             <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
               <div className="flex items-center space-x-2">
                 <AlertTriangle className="w-5 h-5 text-yellow-600" />
                 <p className="text-sm font-medium text-yellow-800">
                   Este cliente requiere reconexión
                 </p>
               </div>
             </div>
           )}
         </div>
       </div>

       {/* Modal de confirmación de eliminación */}
       {showDeleteConfirm && (
         <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
             <div className="p-6">
               <div className="flex items-center space-x-3 mb-4">
                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                   <AlertTriangle className="w-6 h-6 text-red-600" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-gray-900">
                     Confirmar Eliminación
                   </h3>
                   <p className="text-gray-600">
                     Esta acción no se puede deshacer
                   </p>
                 </div>
               </div>
               
               <p className="text-gray-700 mb-6">
                 ¿Estás seguro de que deseas eliminar al cliente{' '}
                 <strong>{client.nombre}</strong>? El cliente será movido a la lista de inactivos.
               </p>
               
               <div className="flex justify-end space-x-4">
                 <button
                   onClick={() => setShowDeleteConfirm(false)}
                   disabled={deleting}
                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                       <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
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
         </div>
       )}
     </div>
   </div>
 );
};

export default ClientModal;