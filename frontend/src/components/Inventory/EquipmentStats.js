// frontend/src/components/Inventory/EquipmentStats.js

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Componente de paginación reutilizable
const Paginator = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
      <span className="text-sm text-gray-500">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
          .reduce((acc, n, i, arr) => {
            if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
            acc.push(n);
            return acc;
          }, [])
          .map((n, i) =>
            n === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400">…</span>
            ) : (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  n === page
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {n}
              </button>
            )
          )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

const PAGE_SIZE_INSTALLERS = 10;
const PAGE_SIZE_MOVEMENTS  = 15;

const EquipmentStats = ({ stats }) => {
  const [pageInstaladores, setPageInstaladores] = useState(1);
  const [pageMovimientos, setPageMovimientos]   = useState(1);

  if (!stats) return null;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

  const calculatePercentage = (value, total) =>
    (!total || total === 0) ? 0 : Math.round((value / total) * 100);

  const total = stats.general?.total_equipos || 0;

  const mainStats = [
    { label: 'Total Equipos',  value: total,                              icon: '📦', color: 'bg-blue-500',   textColor: 'text-blue-600'   },
    { label: 'Disponibles',    value: stats.general?.disponibles || 0,    icon: '✅', color: 'bg-green-500',  textColor: 'text-green-600',  percentage: calculatePercentage(stats.general?.disponibles, total) },
    { label: 'Asignados',      value: stats.general?.asignados || 0,      icon: '👤', color: 'bg-blue-500',   textColor: 'text-blue-600',   percentage: calculatePercentage(stats.general?.asignados, total) },
    { label: 'Instalados',     value: stats.general?.instalados || 0,     icon: '🏠', color: 'bg-purple-500', textColor: 'text-purple-600', percentage: calculatePercentage(stats.general?.instalados, total) },
  ];

  const additionalStats = [
    { label: 'En Mantenimiento', value: stats.general?.en_mantenimiento || 0, icon: '🔧', color: 'text-yellow-600' },
    { label: 'Dañados',          value: stats.general?.dañados || 0,          icon: '❌', color: 'text-red-600'    },
    { label: 'Perdidos',         value: stats.general?.perdidos || 0,          icon: '❓', color: 'text-gray-600'   },
  ];

  // Datos para paginación
  const instaladoresAll = stats.por_instalador || [];
  const totalPagesInstaladores = Math.max(1, Math.ceil(instaladoresAll.length / PAGE_SIZE_INSTALLERS));
  const instaladoresPagina = instaladoresAll.slice(
    (pageInstaladores - 1) * PAGE_SIZE_INSTALLERS,
    pageInstaladores * PAGE_SIZE_INSTALLERS
  );

  const movimientosAll = stats.movimientos_recientes || [];
  const totalPagesMovimientos = Math.max(1, Math.ceil(movimientosAll.length / PAGE_SIZE_MOVEMENTS));
  const movimientosPagina = movimientosAll.slice(
    (pageMovimientos - 1) * PAGE_SIZE_MOVEMENTS,
    pageMovimientos * PAGE_SIZE_MOVEMENTS
  );

  const actionInfo = {
    'asignado':  { icon: '👤', color: 'bg-blue-500'   },
    'devuelto':  { icon: '↩️', color: 'bg-yellow-500' },
    'instalado': { icon: '🏠', color: 'bg-green-500'  },
    'retirado':  { icon: '📤', color: 'bg-orange-500' },
    'dañado':    { icon: '🔧', color: 'bg-red-500'    },
  };

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
                  <p className={`text-2xl font-semibold ${stat.textColor}`}>{stat.value.toLocaleString()}</p>
                  {stat.percentage !== undefined && (
                    <p className="ml-2 text-sm text-gray-500">({stat.percentage}%)</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estadísticas adicionales y valor del inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estados Adicionales</h3>
          <div className="space-y-3">
            {additionalStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{stat.icon}</span>
                  <span className="text-sm text-gray-600">{stat.label}</span>
                </div>
                <span className={`text-lg font-semibold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Valor del Inventario</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(stats.general?.valor_total_inventario)}
            </div>
            <p className="text-sm text-gray-500">Valor total de equipos registrados</p>
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
                'router':        { icon: '📡', color: 'bg-blue-100 text-blue-800'   },
                'decodificador': { icon: '📺', color: 'bg-purple-100 text-purple-800' },
                'cable':         { icon: '🔌', color: 'bg-yellow-100 text-yellow-800' },
                'antena':        { icon: '📡', color: 'bg-green-100 text-green-800'  },
                'splitter':      { icon: '🔀', color: 'bg-indigo-100 text-indigo-800' },
                'amplificador':  { icon: '🔊', color: 'bg-red-100 text-red-800'     },
                'otro':          { icon: '📦', color: 'bg-gray-100 text-gray-800'    },
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
                  <h4 className="font-medium text-gray-900 capitalize mb-1">{tipo.tipo}</h4>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between"><span>Disponibles:</span><span className="text-green-600 font-medium">{tipo.disponibles}</span></div>
                    <div className="flex justify-between"><span>Asignados:</span><span className="text-blue-600 font-medium">{tipo.asignados}</span></div>
                    <div className="flex justify-between"><span>Instalados:</span><span className="text-purple-600 font-medium">{tipo.instalados}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instaladores — con paginación completa */}
      {instaladoresAll.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Instaladores
              <span className="ml-2 text-sm font-normal text-gray-400">({instaladoresAll.length} total)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Instalador', 'Equipos Asignados', 'Pendientes', 'Instalados', 'Promedio Días'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instaladoresPagina.map((instalador, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{instalador.nombre}</div>
                      <div className="text-sm text-gray-500">{instalador.telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {instalador.equipos_asignados}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {instalador.equipos_pendientes}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {instalador.equipos_instalados}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {instalador.promedio_dias_asignacion ? Math.round(instalador.promedio_dias_asignacion) + ' días' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginator
            page={pageInstaladores}
            totalPages={totalPagesInstaladores}
            onChange={p => { setPageInstaladores(p); }}
          />
        </div>
      )}

      {/* Movimientos Recientes — con paginación completa */}
      {movimientosAll.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Movimientos Recientes
              <span className="ml-2 text-sm font-normal text-gray-400">({movimientosAll.length} registros)</span>
            </h3>
          </div>
          <div className="flow-root">
            <ul className="-mb-8">
              {movimientosPagina.map((movimiento, index) => {
                const isLast = index === movimientosPagina.length - 1;
                const info = actionInfo[movimiento.accion] || { icon: '📦', color: 'bg-gray-500' };
                return (
                  <li key={(pageMovimientos - 1) * PAGE_SIZE_MOVEMENTS + index}>
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
                            <p className="text-xs text-gray-400">{movimiento.equipo_nombre}</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {new Date(movimiento.fecha_accion).toLocaleDateString('es-CO', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
          <Paginator
            page={pageMovimientos}
            totalPages={totalPagesMovimientos}
            onChange={p => { setPageMovimientos(p); }}
          />
        </div>
      )}
    </div>
  );
};

export default EquipmentStats;
