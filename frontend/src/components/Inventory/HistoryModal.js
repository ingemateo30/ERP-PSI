// frontend/src/components/Inventory/HistoryModal.js

import React, { useState, useEffect } from 'react';
import inventoryService from '../../services/inventoryService';

const HistoryModal = ({ equipo, onClose }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar historial al montar el componente
  useEffect(() => {
    if (equipo?.id) {
      loadHistorial();
    }
  }, [equipo]);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await inventoryService.getEquipmentHistory(equipo.id);
      setHistorial(response.message || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError('Error al cargar el historial: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener información de la acción
  const getActionInfo = (accion) => {
    const actions = {
      'asignado': {
        icon: '👤',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        label: 'Asignado'
      },
      'devuelto': {
        icon: '↩️',
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        label: 'Devuelto'
      },
      'instalado': {
        icon: '🏠',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        label: 'Instalado'
      },
      'retirado': {
        icon: '📤',
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        label: 'Retirado'
      },
      'dañado': {
        icon: '🔧',
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        label: 'Reportado como dañado'
      }
    };

    return actions[accion] || {
      icon: '📦',
      color: 'bg-gray-500',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      label: accion
    };
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Historial del Equipo
            </h3>
            <div className="mt-2 flex items-center space-x-3">
              <span className="text-2xl">
                {equipo.tipo === 'router' && '📡'}
                {equipo.tipo === 'decodificador' && '📺'}
                {equipo.tipo === 'cable' && '🔌'}
                {equipo.tipo === 'antena' && '📡'}
                {equipo.tipo === 'splitter' && '🔀'}
                {equipo.tipo === 'amplificador' && '🔊'}
                {!['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador'].includes(equipo.tipo) && '📦'}
              </span>
              <div>
                <div className="font-medium text-gray-900">{equipo.codigo}</div>
                <div className="text-sm text-gray-600">{equipo.nombre}</div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-red-600">{error}</p>
              <button
                onClick={loadHistorial}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay movimientos registrados para este equipo.
              </p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {historial.map((item, index) => {
                  const isLast = index === historial.length - 1;
                  const actionInfo = getActionInfo(item.accion);

                  return (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {!isLast && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`${actionInfo.color} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white text-white text-sm`}>
                              {actionInfo.icon}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`${actionInfo.bgColor} rounded-lg p-4`}>
                              <div className="flex items-center justify-between">
                                <h4 className={`font-medium ${actionInfo.textColor}`}>
                                  {actionInfo.label}
                                </h4>
                                <time className="text-sm text-gray-500">
                                  {formatDate(item.fecha_accion)}
                                </time>
                              </div>
                              
                              <div className="mt-2 space-y-2">
                                {/* Instalador */}
                                <div className="flex items-center text-sm">
                                  <span className="font-medium text-gray-700 w-20">Instalador:</span>
                                  <span className="text-gray-900">{item.instalador_nombre}</span>
                                </div>

                                {/* Ubicación */}
                                {item.ubicacion && (
                                  <div className="flex items-center text-sm">
                                    <span className="font-medium text-gray-700 w-20">Ubicación:</span>
                                    <span className="text-gray-900">{item.ubicacion}</span>
                                  </div>
                                )}

                                {/* Cliente */}
                                {item.cliente_nombre && (
                                  <div className="flex items-center text-sm">
                                    <span className="font-medium text-gray-700 w-20">Cliente:</span>
                                    <span className="text-gray-900">{item.cliente_nombre}</span>
                                  </div>
                                )}

                                {/* Coordenadas */}
                                {item.coordenadas_lat && item.coordenadas_lng && (
                                  <div className="flex items-center text-sm">
                                    <span className="font-medium text-gray-700 w-20">Coordenadas:</span>
                                    <span className="text-gray-900">
                                      {item.coordenadas_lat}, {item.coordenadas_lng}
                                    </span>
                                    <a
                                      href={`https://maps.google.com/?q=${item.coordenadas_lat},${item.coordenadas_lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                      title="Ver en Google Maps"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                    </a>
                                  </div>
                                )}

                                {/* Notas */}
                                {item.notas && (
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-700">Notas:</span>
                                    <p className="mt-1 text-gray-900 bg-white rounded p-2 border border-gray-200">
                                      {item.notas}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
          <div className="text-sm text-gray-500">
            {historial.length > 0 && (
              <>
                Total de movimientos: <span className="font-medium">{historial.length}</span>
              </>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadHistorial}
              className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              title="Actualizar historial"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;