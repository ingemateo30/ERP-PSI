// frontend/src/components/Facturas/FacturasStats.js - SIMPLE Y FUNCIONAL
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

const FacturasStats = ({ facturas = [], loading = false }) => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);

  // ==========================================
  // CALCULAR ESTADÍSTICAS DESDE LAS FACTURAS PROPS
  // ==========================================
  useEffect(() => {
    if (Array.isArray(facturas)) {
      console.log('📊 [FacturasStats] Calculando estadísticas desde facturas:', facturas.length);
      
      const statsCalculadas = calcularEstadisticas(facturas);
      setStats(statsCalculadas);
      setLoadingStats(false);
      setErrorStats(null);
    } else {
      // Si no hay facturas en props, intentar cargar desde API
      cargarEstadisticasAPI();
    }
  }, [facturas]);

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
      
      const response = await fetch('/api/v1/facturas/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Adaptar respuesta del API al formato esperado
        const statsAPI = {
          total: data.data.resumen?.total_facturas || 0,
          pendientes: data.data.por_estado?.pendientes || 0,
          pagadas: data.data.por_estado?.pagadas || 0,
          vencidas: data.data.por_estado?.vencidas || 0,
          anuladas: data.data.por_estado?.anuladas || 0,
          monto_total: data.data.resumen?.monto_total || 0,
          monto_pendiente: data.data.resumen?.monto_pendiente || 0,
          monto_pagado: data.data.resumen?.monto_pagado || 0,
          monto_vencido: data.data.resumen?.monto_vencido || 0,
          promedio: data.data.resumen?.promedio_factura || 0,
          facturas_mora: data.data.mora?.facturas_en_mora || 0
        };
        
        setStats(statsAPI);
        console.log('✅ [FacturasStats] Estadísticas cargadas desde API:', statsAPI);
      } else {
        throw new Error(data.message || 'Respuesta inválida del servidor');
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

      {/* Panel de resumen adicional */}
      {statsSeguras.total > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
              Resumen Financiero
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Facturación total */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Facturado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatearMoneda(statsSeguras.monto_total)}
              </p>
            </div>
            
            {/* Promedio por factura */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Promedio por Factura</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatearMoneda(statsSeguras.total > 0 ? statsSeguras.monto_total / statsSeguras.total : 0)}
              </p>
            </div>
            
            {/* Tasa de recaudo */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Tasa de Recaudo</p>
              <p className="text-2xl font-bold text-green-600">
                {statsSeguras.monto_total > 0 
                  ? Math.round((statsSeguras.monto_pagado / statsSeguras.monto_total) * 100)
                  : 0}%
              </p>
            </div>
          </div>

          {/* Barra de progreso visual */}
          {statsSeguras.monto_total > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Distribución de Cartera</span>
                <span>{formatearMoneda(statsSeguras.monto_total)} total</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div className="flex h-full">
                  {/* Pagado */}
                  <div
                    className="bg-green-500 transition-all duration-300"
                    style={{
                      width: `${(statsSeguras.monto_pagado / statsSeguras.monto_total) * 100}%`
                    }}
                    title={`Pagado: ${formatearMoneda(statsSeguras.monto_pagado)}`}
                  ></div>
                  
                  {/* Vencido */}
                  <div
                    className="bg-red-500 transition-all duration-300"
                    style={{
                      width: `${(statsSeguras.monto_vencido / statsSeguras.monto_total) * 100}%`
                    }}
                    title={`Vencido: ${formatearMoneda(statsSeguras.monto_vencido)}`}
                  ></div>
                  
                  {/* Pendiente */}
                  <div
                    className="bg-yellow-500 transition-all duration-300"
                    style={{
                      width: `${((statsSeguras.monto_pendiente - statsSeguras.monto_vencido) / statsSeguras.monto_total) * 100}%`
                    }}
                    title={`Pendiente: ${formatearMoneda(statsSeguras.monto_pendiente - statsSeguras.monto_vencido)}`}
                  ></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-600 mt-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span>Pagado ({Math.round((statsSeguras.monto_pagado / statsSeguras.monto_total) * 100)}%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                  <span>Pendiente</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  <span>Vencido</span>
                </div>
              </div>
            </div>
          )}
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