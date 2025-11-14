// frontend/src/components/Notificaciones/NotificationBell.js

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, Users, Wrench, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import notificacionesService from '../../services/notificacionesService';

const NotificationBell = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const { getToken, userRole } = useAuth();
  const navigate = useNavigate();

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Obtener notificaciones
  const fetchNotificaciones = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await notificacionesService.getUnread(10);
      setNotificaciones(response.data || []);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      // No mostrar error al usuario, solo loggear
      setNotificaciones([]);
    }
  };

  // Contar notificaciones no leídas
  const fetchCount = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await notificacionesService.getUnreadCount();
      setNotificacionesNoLeidas(response.data?.total || 0);
    } catch (error) {
      console.error('Error al contar notificaciones:', error);
      // En caso de error, establecer en 0 para no molestar al usuario
      setNotificacionesNoLeidas(0);
    }
  };

  // Polling cada 30 segundos
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar notificaciones al abrir el panel
  useEffect(() => {
    if (isOpen) {
      fetchNotificaciones();
    }
  }, [isOpen]);

  // Marcar como leída
  const marcarComoLeida = async (id) => {
    try {
      await notificacionesService.markAsRead(id);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      setNotificacionesNoLeidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
    try {
      setLoading(true);
      await notificacionesService.markAllAsRead();
      setNotificaciones([]);
      setNotificacionesNoLeidas(0);
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar notificación
  const eliminarNotificacion = async (id) => {
    try {
      await notificacionesService.delete(id);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      setNotificacionesNoLeidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
    }
  };

  // Manejar clic en notificación
  const handleNotificationClick = (notificacion) => {
    // Marcar como leída
    marcarComoLeida(notificacion.id);

    // Navegar según el tipo de notificación
    if (notificacion.datos_adicionales) {
      const datos = notificacion.datos_adicionales;

      if (notificacion.tipo === 'nuevo_cliente' && datos.cliente_id) {
        navigate(`/clients/${datos.cliente_id}`);
        setIsOpen(false);
      } else if (notificacion.tipo === 'nueva_instalacion' && datos.instalacion_id) {
        navigate(`/instalaciones`);
        setIsOpen(false);
      }
    }
  };

  // Obtener icono según el tipo de notificación
  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'nuevo_cliente':
        return <Users size={20} className="text-green-500" />;
      case 'nueva_instalacion':
        return <Wrench size={20} className="text-blue-500" />;
      case 'instalacion_actualizada':
        return <Wrench size={20} className="text-orange-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras}h`;
    if (diffDias < 7) return `Hace ${diffDias}d`;

    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón de campanita */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gray-100 relative transition-colors"
      >
        <Bell size={20} className="text-gray-600" />
        {notificacionesNoLeidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#e21f25] text-white text-xs font-bold rounded-full px-1">
            {notificacionesNoLeidas > 99 ? '99+' : notificacionesNoLeidas}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notificaciones
              {notificacionesNoLeidas > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({notificacionesNoLeidas})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {notificaciones.length > 0 && (
                <button
                  onClick={marcarTodasComoLeidas}
                  disabled={loading}
                  className="text-sm text-[#0e6493] hover:text-[#0a5273] transition-colors flex items-center gap-1"
                  title="Marcar todas como leídas"
                >
                  <CheckCircle size={16} />
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1">
            {notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell size={48} className="text-gray-300 mb-3" />
                <p className="text-gray-500 text-center">
                  No tienes notificaciones nuevas
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notificaciones.map((notificacion) => (
                  <div
                    key={notificacion.id}
                    className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => handleNotificationClick(notificacion)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notificacion.tipo)}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {notificacion.titulo}
                        </p>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notificacion.mensaje}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatearFecha(notificacion.created_at)}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarComoLeida(notificacion.id);
                          }}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                          title="Marcar como leída"
                        >
                          <Check size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarNotificacion(notificacion.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>

                    {/* Indicador de no leída */}
                    {!notificacion.leida && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#e21f25] rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
