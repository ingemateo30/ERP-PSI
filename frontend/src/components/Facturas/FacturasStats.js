// frontend/src/components/Facturas/FacturasStats.js
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  TrendingDown,
} from 'lucide-react';

// ── Gráfica de dona SVG ──────────────────────────────────────────────────────
const DonutChart = ({ segments, size = 160, strokeWidth = 28 }) => {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circumference;
    const gap  = circumference - dash;
    const arc  = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      {/* fondo gris */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
};

const FacturasStats = ({ facturas = [], loading = false }) => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);

// ==========================================
  // CARGAR ESTADÍSTICAS DESDE BACKEND SIEMPRE
  // ==========================================
  useEffect(() => {
    // ✅ SIEMPRE cargar desde el backend (totales reales)
    console.log('📊 [FacturasStats] Cargando estadísticas desde backend...');
    cargarEstadisticasAPI();
  }, []); // Sin dependencias para que cargue solo una vez al montar
// ==========================================
// ESCUCHAR EVENTO DE ACTUALIZACIÓN
// ==========================================
useEffect(() => {
  const handleActualizarStats = () => {
    console.log('📊 [FacturasStats] Evento recibido - Actualizando estadísticas...');
    cargarEstadisticasAPI();
  };

  window.addEventListener('actualizar-estadisticas-facturas', handleActualizarStats);

  return () => {
    window.removeEventListener('actualizar-estadisticas-facturas', handleActualizarStats);
  };
}, []);
  // ==========================================
  // FUNCIÓN PARA CALCULAR ESTADÍSTICAS LOCALMENTE
  // ==========================================
  const calcularEstadisticas = (listaFacturas) => {
    if (!Array.isArray(listaFacturas) || listaFacturas.length === 0) {
      return {
        total: 0,
        pendientes: 0,
        pagadas: 0,
        vencidas: 0,
        anuladas: 0,
        monto_total: 0,
        monto_pendiente: 0,
        monto_pagado: 0,
        monto_vencido: 0,
        promedio: 0,
        facturas_mora: 0
      };
    }

    const ahora = new Date();
    
    return listaFacturas.reduce((acc, factura) => {
      const monto = parseFloat(factura.total) || 0;
      acc.total++;
      acc.monto_total += monto;
      
      // Contar por estado
      switch (factura.estado?.toLowerCase()) {
        case 'pendiente':
          acc.pendientes++;
          acc.monto_pendiente += monto;
          
          // Verificar si está vencida
          if (factura.fecha_vencimiento && new Date(factura.fecha_vencimiento) < ahora) {
            acc.facturas_mora++;
            acc.monto_vencido += monto;
          }
          break;
          
        case 'pagada':
          acc.pagadas++;
          acc.monto_pagado += monto;
          break;
          
        case 'vencida':
          acc.vencidas++;
          acc.monto_pendiente += monto;
          acc.monto_vencido += monto;
          acc.facturas_mora++;
          break;
          
        case 'anulada':
          acc.anuladas++;
          break;
      }
      
      return acc;
    }, {
      total: 0,
      pendientes: 0,
      pagadas: 0,
      vencidas: 0,
      anuladas: 0,
      monto_total: 0,
      monto_pendiente: 0,
      monto_pagado: 0,
      monto_vencido: 0,
      promedio: 0,
      facturas_mora: 0
    });
  };

  // ==========================================
  // FUNCIÓN PARA CARGAR DESDE API (FALLBACK)
  // ==========================================
  const cargarEstadisticasAPI = async () => {
  try {
    setLoadingStats(true);
    setErrorStats(null);
    
    console.log('📊 [FacturasStats] Cargando estadísticas desde API...');
    
    // ✅ USAR apiService que ya está configurado
    const apiService = await import('../../services/apiService');
    const response = await apiService.default.get('/facturas/stats');
    
    console.log('📊 Respuesta del backend:', response);
    
    // ✅ ADAPTADO para múltiples formatos de respuesta
    if (response.success && response.data) {
      const data = response.data;
      
      const statsAPI = {
        total: parseInt(data.total || data.total_facturas || 0),
        pendientes: parseInt(data.pendientes || data.total_pendientes || 0),
        pagadas: parseInt(data.pagadas || data.total_pagadas || 0),
        vencidas: parseInt(data.vencidas || data.total_vencidas || 0),
        anuladas: parseInt(data.anuladas || data.total_anuladas || 0),
        monto_total: parseFloat(data.valor_total || data.monto_total || 0),
        monto_pendiente: parseFloat(data.valor_pendiente || data.monto_pendiente || 0),
        monto_pagado: parseFloat(data.valor_pagado || data.monto_pagado || 0),
        monto_vencido: parseFloat(data.valor_vencido || data.monto_vencido || 0),
        promedio: parseFloat(data.promedio_factura || 0),
        facturas_mora: parseInt(data.facturas_mora || 0)
      };
      
      setStats(statsAPI);
      console.log('✅ [FacturasStats] Estadísticas cargadas:', statsAPI);
    } else {
      throw new Error('Respuesta inválida del servidor');
    }
    
  } catch (error) {
    console.error('❌ [FacturasStats] Error cargando estadísticas:', error);
    setErrorStats(error.message);
    
    // Usar estadísticas vacías como fallback
    setStats({
      total: 0, pendientes: 0, pagadas: 0, vencidas: 0, anuladas: 0,
      monto_total: 0, monto_pendiente: 0, monto_pagado: 0, monto_vencido: 0,
      promedio: 0, facturas_mora: 0
    });
  } finally {
    setLoadingStats(false);
  }
};
  // ==========================================
  // FUNCIÓN DE REFRESCO MANUAL
  // ==========================================
  const handleRefrescar = () => {
    console.log('🔄 [FacturasStats] Refrescando estadísticas...');
    if (Array.isArray(facturas) && facturas.length > 0) {
      const statsActualizadas = calcularEstadisticas(facturas);
      setStats(statsActualizadas);
    } else {
      cargarEstadisticasAPI();
    }
  };

  // ==========================================
  // UTILIDADES DE FORMATO
  // ==========================================
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  const formatearNumero = (valor) => {
    return new Intl.NumberFormat('es-CO').format(valor || 0);
  };

  // ==========================================
  // RENDERIZADO DE ESTADOS
  // ==========================================

  // Estado de carga
  if (loading || loadingStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="w-12 h-6 bg-gray-200 rounded"></div>
            </div>
            <div className="w-24 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Estado de error
  if (errorStats && !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-red-800 font-medium">Error al cargar estadísticas</h3>
              <p className="text-red-600 text-sm mt-1">{errorStats}</p>
            </div>
          </div>
          <button
            onClick={handleRefrescar}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Asegurar que stats existe
  const statsSeguras = stats || {
    total: 0, pendientes: 0, pagadas: 0, vencidas: 0, anuladas: 0,
    monto_total: 0, monto_pendiente: 0, monto_pagado: 0, monto_vencido: 0,
    promedio: 0, facturas_mora: 0
  };

  // ==========================================
  // CONFIGURACIÓN DE TARJETAS
  // ==========================================
  const tarjetas = [
    {
      titulo: 'Total Facturas',
      valor: statsSeguras.total,
      monto: formatearMoneda(statsSeguras.monto_total),
      icono: FileText,
      color: 'blue',
      descripcion: `${formatearNumero(statsSeguras.total)} facturas registradas`
    },
    {
      titulo: 'Pendientes',
      valor: statsSeguras.pendientes,
      monto: formatearMoneda(statsSeguras.monto_pendiente),
      icono: Clock,
      color: 'yellow',
      descripcion: `${statsSeguras.facturas_mora} en mora`
    },
    {
      titulo: 'Pagadas',
      valor: statsSeguras.pagadas,
      monto: formatearMoneda(statsSeguras.monto_pagado),
      icono: CheckCircle,
      color: 'green',
      descripcion: `${statsSeguras.total > 0 ? Math.round((statsSeguras.pagadas / statsSeguras.total) * 100) : 0}% del total`
    },
    {
      titulo: 'Vencidas',
      valor: statsSeguras.vencidas + statsSeguras.facturas_mora,
      monto: formatearMoneda(statsSeguras.monto_vencido),
      icono: XCircle,
      color: 'red',
      descripción: 'Requieren atención urgente'
    }
  ];

  // ==========================================
  // OBTENER COLORES POR TIPO
  // ==========================================
  const obtenerColores = (color) => {
    const colores = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        value: 'text-blue-800',
        desc: 'text-blue-600'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: 'text-yellow-600',
        title: 'text-yellow-900',
        value: 'text-yellow-800',
        desc: 'text-yellow-600'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        value: 'text-green-800',
        desc: 'text-green-600'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
        value: 'text-red-800',
        desc: 'text-red-600'
      }
    };
    return colores[color] || colores.blue;
  };

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <div className="mb-8">
      {/* Cabecera con botón de refresco */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Estadísticas de Facturas
        </h2>
        <button
          onClick={handleRefrescar}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2 inline" />
          Actualizar
        </button>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {tarjetas.map((tarjeta, index) => {
          const colores = obtenerColores(tarjeta.color);
          const IconComponent = tarjeta.icono;
          
          return (
            <div
              key={index}
              className={`${colores.bg} ${colores.border} border rounded-lg p-6 transition-all duration-200 hover:shadow-lg`}
            >
              {/* Header de la tarjeta */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <IconComponent className={`w-6 h-6 ${colores.icon} mr-3`} />
                  <h3 className={`text-sm font-medium ${colores.title}`}>
                    {tarjeta.titulo}
                  </h3>
                </div>
              </div>
              
              {/* Valores principales */}
              <div className="space-y-2">
                <p className={`text-3xl font-bold ${colores.value}`}>
                  {formatearNumero(tarjeta.valor)}
                </p>
                <p className={`text-lg font-semibold ${colores.value}`}>
                  {tarjeta.monto}
                </p>
                <p className={`text-sm ${colores.desc}`}>
                  {tarjeta.descripcion}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de resumen financiero con gráfica */}
      {statsSeguras.total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Resumen Financiero
            </h3>
            <span className="text-sm text-gray-500">
              Total: {formatearMoneda(statsSeguras.monto_total)}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Gráfica de dona */}
            {statsSeguras.monto_total > 0 && (
              <div className="relative flex-shrink-0">
                <DonutChart
                  size={160}
                  strokeWidth={30}
                  segments={[
                    { value: statsSeguras.monto_pagado,                                    color: '#22c55e', label: 'Pagado'   },
                    { value: statsSeguras.monto_vencido,                                   color: '#ef4444', label: 'Vencido'  },
                    { value: Math.max(0, statsSeguras.monto_pendiente - statsSeguras.monto_vencido), color: '#f59e0b', label: 'Pendiente' },
                  ]}
                />
                {/* Porcentaje recaudo en el centro */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round((statsSeguras.monto_pagado / statsSeguras.monto_total) * 100)}%
                  </span>
                  <span className="text-xs text-gray-500">recaudado</span>
                </div>
              </div>
            )}

            {/* Leyenda y métricas */}
            <div className="flex-1 space-y-4 w-full">
              {[
                { label: 'Pagado',    value: statsSeguras.monto_pagado,  pct: statsSeguras.monto_total > 0 ? Math.round((statsSeguras.monto_pagado / statsSeguras.monto_total) * 100) : 0,  color: 'bg-green-500',  textColor: 'text-green-700'  },
                { label: 'Pendiente', value: Math.max(0, statsSeguras.monto_pendiente - statsSeguras.monto_vencido), pct: statsSeguras.monto_total > 0 ? Math.round(((statsSeguras.monto_pendiente - statsSeguras.monto_vencido) / statsSeguras.monto_total) * 100) : 0, color: 'bg-yellow-400', textColor: 'text-yellow-700' },
                { label: 'Vencido',   value: statsSeguras.monto_vencido, pct: statsSeguras.monto_total > 0 ? Math.round((statsSeguras.monto_vencido / statsSeguras.monto_total) * 100) : 0,  color: 'bg-red-500',   textColor: 'text-red-700'    },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${item.textColor}`}>{formatearMoneda(item.value)}</span>
                      <span className="text-xs text-gray-400 w-8 text-right">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div className="text-center bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Promedio/Factura</p>
                  <p className="text-base font-bold text-gray-900">
                    {formatearMoneda(statsSeguras.total > 0 ? statsSeguras.monto_total / statsSeguras.total : 0)}
                  </p>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">En Mora</p>
                  <p className="text-base font-bold text-red-600">
                    {statsSeguras.facturas_mora} facturas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje si no hay datos */}
      {statsSeguras.total === 0 && (
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay facturas registradas
          </h3>
          <p className="text-gray-600">
            Comienza creando tu primera factura para ver las estadísticas aquí.
          </p>
        </div>
      )}
    </div>
  );
};

export default FacturasStats;