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
      cargarDatosCompletos();
    }
  }, [instalacion]);

  const cargarDatosCompletos = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Parsear equipos instalados
      let equiposIds = [];
      try {
        if (instalacion.equipos_instalados) {
          equiposIds = typeof instalacion.equipos_instalados === 'string'
            ? JSON.parse(instalacion.equipos_instalados)
            : instalacion.equipos_instalados;
        } else if (instalacion.equipos) {
          equiposIds = typeof instalacion.equipos === 'string'
            ? JSON.parse(instalacion.equipos)
            : instalacion.equipos;
        }
        
        console.log('📦 MODAL DETALLE - IDs de equipos:', equiposIds);
        
        // Filtrar IDs válidos
        equiposIds = Array.isArray(equiposIds) 
          ? equiposIds.filter(id => id !== null && id !== undefined && id !== '')
          : [];
          
      } catch (e) {
        console.error('❌ Error parseando IDs de equipos:', e);
        equiposIds = [];
      }

      // Obtener datos completos de los equipos
      if (equiposIds.length > 0) {
        const equiposCompletos = [];
        
        for (const equipoId of equiposIds) {
          try {
            console.log(`🔍 Intentando cargar equipo ID: ${equipoId}`);
            const response = await fetch(
              `${process.env.REACT_APP_API_URL}/equipos/${equipoId}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            console.log(`📊 Response status para equipo ${equipoId}:`, response.status);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`📦 Data recibida para equipo ${equipoId}:`, data);
              
              if (data.success && data.equipo) {
                equiposCompletos.push(data.equipo);
                console.log('✅ Equipo cargado exitosamente:', data.equipo);
              } else if (data.success && data.equipos) {
                // Por si el backend retorna "equipos" en plural
                equiposCompletos.push(data.equipos);
                console.log('✅ Equipo cargado exitosamente (plural):', data.equipos);
              } else if (data) {
                // Por si solo retorna el objeto directo
                equiposCompletos.push(data);
                console.log('✅ Equipo cargado (directo):', data);
              }
            } else {
              const errorText = await response.text();
              console.error(`❌ Error ${response.status} cargando equipo ${equipoId}:`, errorText);
            }
          } catch (error) {
            console.error('❌ Error de red cargando equipo:', equipoId, error);
          }
        }
        
        setEquipos(equiposCompletos);
        console.log('📦 MODAL DETALLE - Equipos completos cargados:', equiposCompletos);
      } else {
        setEquipos([]);
      }

// Parsear fotos - VERSIÓN MEJORADA
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

        console.log('📷 MODAL DETALLE - Fotos raw:', fotosData);

        if (fotosData && Array.isArray(fotosData) && fotosData.length > 0) {
          // Filtrar fotos válidas (que sean strings base64 o objetos con url/data)
          const fotosValidas = fotosData.filter(foto => {
            if (typeof foto === 'string' && foto.startsWith('data:image')) {
              return true;
            }
            if (foto && typeof foto === 'object' && (foto.url || foto.data)) {
              return true;
            }
            return false;
          });

          console.log('📷 Fotos válidas encontradas:', fotosValidas.length);

          // Asignar las fotos
          if (fotosValidas.length >= 1) {
            const primeraFoto = typeof fotosValidas[0] === 'string' 
              ? fotosValidas[0] 
              : (fotosValidas[0].url || fotosValidas[0].data);
            
            const segundaFoto = fotosValidas.length >= 2
              ? (typeof fotosValidas[1] === 'string' 
                  ? fotosValidas[1] 
                  : (fotosValidas[1].url || fotosValidas[1].data))
              : null;

            setFotos({
              antes: primeraFoto,
              despues: segundaFoto
            });

            console.log('📷 Fotos asignadas - Antes:', primeraFoto ? 'SI' : 'NO', 'Después:', segundaFoto ? 'SI' : 'NO');
          }
        } else {
          console.log('📷 No hay fotos en el array');
          setFotos({ antes: null, despues: null });
        }
      } catch (e) {
        console.error('❌ Error parseando fotos:', e);
        setFotos({ antes: null, despues: null });
      }
      
    } catch (error) {
      console.error('❌ Error general cargando datos:', error);
    }
  };

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
                Equipos Instalados ({equipos.length})
              </h3>
              <div className="space-y-3">
                {equipos.map((equipo, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg">
                          {equipo.codigo || equipo.equipo_codigo || 'Sin código'}
                        </p>
                        <p className="text-sm text-gray-700 font-medium mt-1">
                          {equipo.nombre || equipo.equipo_nombre || equipo.descripcion || 'Sin nombre'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {equipo.tipo || equipo.tipo_equipo || 'Sin tipo'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {equipo.marca || 'Sin marca'}
                          </span>
                          {equipo.modelo && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {equipo.modelo}
                            </span>
                          )}
                        </div>
                        {/* Mostrar si es el equipo principal */}
                        {(equipo.es_principal || equipo.principal || equipo.tipo?.toLowerCase().includes('ont') || equipo.tipo?.toLowerCase().includes('router')) && (
                          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                            ⭐ EQUIPO PRINCIPAL
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {(equipo.numero_serie || equipo.serial) && (
                          <p className="text-xs text-gray-600 mb-1">
                            <span className="font-semibold">S/N:</span> {equipo.numero_serie || equipo.serial}
                          </p>
                        )}
                        {equipo.mac && (
                          <p className="text-xs text-gray-600 mb-1">
                            <span className="font-semibold">MAC:</span> {equipo.mac}
                          </p>
                        )}
                        {equipo.estado && (
                          <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                            equipo.estado === 'disponible' ? 'bg-green-100 text-green-800' :
                            equipo.estado === 'asignado' ? 'bg-blue-100 text-blue-800' :
                            equipo.estado === 'en_uso' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {equipo.estado.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    {equipo.observaciones && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">📝 Observaciones:</span> {equipo.observaciones}
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
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <ImageIcon size={16} className="mr-2" />
                     Instalación Completada
                    </p>
                    <img
                      src={fotos.antes}
                      alt="Instalación completada"
                      className="w-full h-64 object-cover rounded-lg shadow-sm"
                      onError={(e) => {
                        console.error('❌ Error cargando imagen ANTES');
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VuIG5vIGRpc3BvbmlibGU8L3RleHQ+PC9zdmc+';
                      }}
                    />
                  </div>
                )}
                {fotos.despues && (
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <ImageIcon size={16} className="mr-2" />
                      Después de la Instalación
                    </p>
                    <img
                      src={fotos.despues}
                      alt="Después de la instalación"
                      className="w-full h-64 object-cover rounded-lg shadow-sm"
                      onError={(e) => {
                        console.error('❌ Error cargando imagen DESPUÉS');
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VuIG5vIGRpc3BvbmlibGU8L3RleHQ+PC9zdmc+';
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