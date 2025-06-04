// frontend/src/components/Inventory/EquipmentStats.js

import React from 'react';

const EquipmentStats = ({ stats }) => {
  if (!stats) return null;

  // Formatear valores monetarios
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  // Calcular porcentajes
  const calculatePercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const total = stats.general?.total_equipos || 0;

  // Datos para las tarjetas principales
  const mainStats = [
    {
      label: 'Total Equipos',
      value: total,
      icon: '📦',
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      label: 'Disponibles',
      value: stats.general?.disponibles || 0,
      percentage: calculatePercentage(stats.general?.disponibles, total),
      icon: '✅',
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      label: 'Asignados',
      value: stats.general?.asignados || 0,
      percentage: calculatePercentage(stats.general?.asignados, total),
      icon: '👤',
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      label: 'Instalados',
      value: stats.general?.instalados || 0,
      percentage: calculatePercentage(stats.general?.instalados, total),
      icon: '🏠',
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    }
  ];

  // Datos adicionales
  const additionalStats = [
    {
      label: 'En Mantenimiento',
      value: stats.general?.en_mantenimiento || 0,
      icon: '🔧',
      color: 'text-yellow-600'
    },
    {
      label: 'Dañados',
      value: stats.general?.dañados || 0,
      icon: '❌',
      color: 'text-red-600'
    },
    {
      label: 'Perdidos',
      value: stats.general?.perdidos || 0,
      icon: '❓',
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center text-white text-lg`}>
                  {stat.icon}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <div className="flex items-baseline">
                  <p className={`text-2xl font-semibold ${stat.textColor}`}>
                    {stat.value.toLocaleString()}
                  </p>
                  {stat.percentage !== undefined && (
                    <p className="ml-2 text-sm text-gray-500">
                      ({stat.percentage}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estadísticas adicionales y valor del inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estadísticas adicionales */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estados Adicionales</h3>
          <div className="space-y-3">
            {additionalStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{stat.icon}</span>
                  <span className="text-sm text-gray-600">{stat.label}</span>
                </div>
                <span className={`text-lg font-semibold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Valor del inventario */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Valor del Inventario</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(stats.general?.valor_total_inventario)}
            </div>
            <p className="text-sm text-gray-500">
              Valor total de equipos registrados
            </p>
          </div>
        </div>
      </div>

      {/* Distribución por tipo */}
      {stats.por_tipo && stats.por_tipo.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribución por Tipo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stats.por_tipo.map((tipo, index) => {
              const typeInfo = {
                'router': { icon: '📡', color: 'bg-blue-100 text-blue-800' },
                'decodificador': { icon: '📺', color: 'bg-purple-100 text-purple-800' },
                'cable': { icon: '🔌', color: 'bg-yellow-100 text-yellow-800' },
                'antena': { icon: '📡', color: 'bg-green-100 text-green-800' },
                'splitter': { icon: '🔀', color: 'bg-indigo-100 text-indigo-800' },
                'amplificador': { icon: '🔊', color: 'bg-red-100 text-red-800' },
                'otro': { icon: '📦', color: 'bg-gray-100 text-gray-800' }
              };

              const info = typeInfo[tipo.tipo] || typeInfo['otro'];

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{info.icon}</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${info.color}`}>
                      {tipo.cantidad}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 capitalize mb-1">
                    {tipo.tipo}
                  </h4>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Disponibles:</span>
                      <span className="text-green-600 font-medium">{tipo.disponibles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Asignados:</span>
                      <span className="text-blue-600 font-medium">{tipo.asignados}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Instalados:</span>
                      <span className="text-purple-600 font-medium">{tipo.instalados}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top instaladores */}
      {stats.por_instalador && stats.por_instalador.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Instaladores</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instalador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipos Asignados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendientes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instalados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promedio Días
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.por_instalador.slice(0, 5).map((instalador, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {instalador.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          {instalador.telefono}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {instalador.equipos_asignados}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {instalador.equipos_pendientes}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {instalador.equipos_instalados}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {instalador.promedio_dias_asignacion ? 
                        Math.round(instalador.promedio_dias_asignacion) + ' días' : 
                        '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movimientos recientes */}
      {stats.movimientos_recientes && stats.movimientos_recientes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Movimientos Recientes</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {stats.movimientos_recientes.map((movimiento, index) => {
                const isLast = index === stats.movimientos_recientes.length - 1;
                
                const actionInfo = {
                  'asignado': { icon: '👤', color: 'bg-blue-500' },
                  'devuelto': { icon: '↩️', color: 'bg-yellow-500' },
                  'instalado': { icon: '🏠', color: 'bg-green-500' },
                  'retirado': { icon: '📤', color: 'bg-orange-500' },
                  'dañado': { icon: '🔧', color: 'bg-red-500' }
                };

                const info = actionInfo[movimiento.accion] || { icon: '📦', color: 'bg-gray-500' };

                return (
                  <li key={index}>
                    <div className="relative pb-8">
                      {!isLast && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`${info.color} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white text-white text-sm`}>
                            {info.icon}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{movimiento.codigo}</span> fue{' '}
                              <span className="font-medium">{movimiento.accion}</span>
                              {movimiento.instalador_nombre && (
                                <> por <span className="font-medium">{movimiento.instalador_nombre}</span></>
                              )}
                              {movimiento.cliente_nombre && (
                                <> para <span className="font-medium">{movimiento.cliente_nombre}</span></>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {movimiento.equipo_nombre}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {new Date(movimiento.fecha_accion).toLocaleDateString('es-CO', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentStats;