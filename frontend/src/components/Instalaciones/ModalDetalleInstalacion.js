// frontend/src/components/Instalaciones/ModalDetalleInstalacion.js
import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Package,
  CheckCircle,
  Image as ImageIcon,
  FileText
} from 'lucide-react';

const ModalDetalleInstalacion = ({ isOpen, onClose, instalacion }) => {
  const [equipos, setEquipos] = useState([]);
  const [fotos, setFotos] = useState({ antes: null, despues: null });

  useEffect(() => {
    if (instalacion) {
      console.log('🔍 MODAL DETALLE - Instalación completa:', instalacion);
      
      // Parsear equipos
      try {
        let equiposData = null;
        
        // Intentar obtener equipos de diferentes campos posibles
        if (instalacion.equipos_instalados) {
          equiposData = typeof instalacion.equipos_instalados === 'string'
            ? JSON.parse(instalacion.equipos_instalados)
            : instalacion.equipos_instalados;
        } else if (instalacion.equipos) {
          equiposData = typeof instalacion.equipos === 'string'
            ? JSON.parse(instalacion.equipos)
            : instalacion.equipos;
        }
        
        console.log('📦 MODAL DETALLE - Equipos parseados:', equiposData);
        
        // Asegurarse de que sea un array
        if (Array.isArray(equiposData)) {
          setEquipos(equiposData);
        } else if (equiposData && typeof equiposData === 'object') {
          // Si es un objeto único, convertirlo a array
          setEquipos([equiposData]);
        } else {
          setEquipos([]);
        }
      } catch (e) {
        console.error('❌ Error parseando equipos:', e);
        setEquipos([]);
      }

// Parsear fotos
      try {
        let fotosData = null;
        
        if (instalacion.fotos_instalacion) {
          fotosData = typeof instalacion.fotos_instalacion === 'string'
            ? JSON.parse(instalacion.fotos_instalacion)
            : instalacion.fotos_instalacion;
        } else if (instalacion.fotos) {
          fotosData = typeof instalacion.fotos === 'string'
            ? JSON.parse(instalacion.fotos)
            : instalacion.fotos;
        }

        console.log('📷 MODAL DETALLE - Fotos parseadas:', fotosData);

        if (fotosData && Array.isArray(fotosData)) {
          const fotoAntes = fotosData.find(f => 
            f.descripcion?.toLowerCase().includes('antes')
          );
          const fotoDespues = fotosData.find(f => 
            f.descripcion?.toLowerCase().includes('después') || 
            f.descripcion?.toLowerCase().includes('despues')
          );

          setFotos({
            antes: fotoAntes?.url || null,
            despues: fotoDespues?.url || null
          });
        } else {
          setFotos({ antes: null, despues: null });
        }
      } catch (e) {
        console.error('❌ Error parseando fotos:', e);
        setFotos({ antes: null, despues: null });
      }
    }
  }, [instalacion]);

  if (!isOpen || !instalacion) return null;

  const getEstadoBadge = (estado) => {
    const badges = {
      'programada': 'bg-blue-100 text-blue-800',
      'en_proceso': 'bg-yellow-100 text-yellow-800',
      'completada': 'bg-green-100 text-green-800',
      'cancelada': 'bg-red-100 text-red-800'
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      'programada': 'Programada',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return textos[estado] || estado;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0e6493] text-white p-6 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Detalles de Instalación</h2>
            <p className="text-sm opacity-90 mt-1">ID: #{instalacion.id}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoBadge(instalacion.estado)}`}>
              {getEstadoTexto(instalacion.estado)}
            </span>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información del Cliente */}
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <User className="mr-2" size={20} />
              Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium text-gray-900">{instalacion.cliente_nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <Phone size={16} className="mr-2" />
                  {instalacion.cliente_telefono}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Dirección de Instalación</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <MapPin size={16} className="mr-2" />
                  {instalacion.direccion_instalacion}
                </p>
              </div>
            </div>
          </div>

          {/* Información de Programación */}
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Calendar className="mr-2" size={20} />
              Programación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Fecha Programada</p>
                <p className="font-medium text-gray-900">
                  {new Date(instalacion.fecha_programada).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hora</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <Clock size={16} className="mr-2" />
                  {instalacion.hora_programada}
                </p>
              </div>
              {instalacion.fecha_inicio && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de Inicio Real</p>
                  <p className="font-medium text-gray-900">
                    {new Date(instalacion.fecha_inicio).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
              {instalacion.fecha_completada && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de Finalización</p>
                  <p className="font-medium text-gray-900">
                    {new Date(instalacion.fecha_completada).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Equipos Instalados */}
          {equipos && equipos.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Package className="mr-2" size={20} />
                Equipos Instalados ({equipos.filter(e => e !== null).length})
              </h3>
              <div className="space-y-3">
                {equipos.filter(equipo => equipo !== null).map((equipo, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {equipo.equipo_codigo || equipo.codigo || 'Sin código'}
                        </p>
                        <p className="text-sm text-gray-700">
                          {equipo.equipo_nombre || equipo.nombre || equipo.descripcion || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {equipo.tipo || equipo.tipo_equipo || 'Sin tipo'} • {equipo.marca || 'Sin marca'}
                        </p>
                        {/* Mostrar si es el equipo principal */}
                        {(equipo.es_principal || equipo.principal) && (
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            EQUIPO PRINCIPAL
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Cantidad: {equipo.cantidad || 1}
                        </p>
                        {(equipo.numero_serie || equipo.serial) && (
                          <p className="text-xs text-gray-500 mt-1">
                            S/N: {equipo.numero_serie || equipo.serial}
                          </p>
                        )}
                        {equipo.mac && (
                          <p className="text-xs text-gray-500 mt-1">
                            MAC: {equipo.mac}
                          </p>
                        )}
                      </div>
                    </div>
                    {equipo.observaciones && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Observaciones:</span> {equipo.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos */}
          {(fotos.antes || fotos.despues) && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <ImageIcon className="mr-2" size={20} />
                Fotografías de la Instalación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fotos.antes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Antes de la Instalación</p>
                    <img
                      src={fotos.antes}
                      alt="Antes de la instalación"
                      className="w-full h-64 object-cover rounded-lg border border-gray-200 shadow-sm"
                      onError={(e) => {
                        console.error('❌ Error cargando imagen ANTES');
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {fotos.despues && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Después de la Instalación</p>
                    <img
                      src={fotos.despues}
                      alt="Después de la instalación"
                      className="w-full h-64 object-cover rounded-lg border border-gray-200 shadow-sm"
                      onError={(e) => {
                        console.error('❌ Error cargando imagen DESPUÉS');
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {instalacion.observaciones && (
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <FileText className="mr-2" size={20} />
                Observaciones
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{instalacion.observaciones}</p>
            </div>
          )}

          {/* Motivo de Cancelación */}
          {instalacion.estado === 'cancelada' && instalacion.motivo_cancelacion && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5">
              <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center">
                <X className="mr-2" size={20} />
                Motivo de Cancelación
              </h3>
              <p className="text-red-700">{instalacion.motivo_cancelacion}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#0e6493] hover:bg-[#0a4d6e] text-white rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleInstalacion;