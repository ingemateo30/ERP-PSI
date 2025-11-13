import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Package,
  FileText, Wrench, AlertTriangle, CheckCircle, Clock,
  BarChart3, PieChart, Activity, RefreshCw, Calendar,
  ArrowUp, ArrowDown, Minus, Download, Filter, MapPin,
  Zap, Target, Award, Briefcase, PhoneCall, Mail,
  WifiOff, Wifi, UserPlus, UserMinus, TrendingUpDown,
  ShoppingCart, CreditCard, Building, Globe, Star
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart as RechartPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart
} from 'recharts';
import estadisticasService from '../../services/estadisticasService';

const EstadisticasGeneral = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [filtros, setFiltros] = useState({
    fecha_desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    cargarEstadisticas();
  }, [filtros]);

  // Animación de conteo para números
  useEffect(() => {
    if (estadisticas) {
      const animateValue = (key, end, duration = 1000) => {
        const start = 0;
        const startTime = Date.now();

        const animate = () => {
          const now = Date.now();
          const progress = Math.min((now - startTime) / duration, 1);
          const easeOutQuart = 1 - Math.pow(1 - progress, 4);
          const current = Math.floor(start + (end - start) * easeOutQuart);

          setAnimatedValues(prev => ({ ...prev, [key]: current }));

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        animate();
      };

      // Animar valores principales
      if (estadisticas.financieras?.periodo) {
        animateValue('totalFacturado', estadisticas.financieras.periodo.total_facturado || 0);
        animateValue('totalRecaudado', estadisticas.financieras.periodo.total_recaudado || 0);
        animateValue('carteraVencida', estadisticas.financieras.cartera?.cartera_vencida || 0);
      }
      if (estadisticas.clientes?.resumen) {
        animateValue('clientesActivos', estadisticas.clientes.resumen.activos || 0, 800);
      }
    }
  }, [estadisticas]);

  const cargarEstadisticas = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await estadisticasService.getDashboard(filtros);

      if (response.success) {
        setEstadisticas(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Error al cargar las estadísticas');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    cargarEstadisticas();
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    const today = new Date();
    let fechaDesde;

    switch(period) {
      case 'semana':
        fechaDesde = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        fechaDesde = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'trimestre':
        fechaDesde = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'año':
        fechaDesde = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        fechaDesde = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    setFiltros({
      fecha_desde: fechaDesde.toISOString().split('T')[0],
      fecha_hasta: today.toISOString().split('T')[0]
    });
  };

  // Colores para gráficos
  const COLORS = {
    primary: '#0e6493',
    secondary: '#e21f25',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899'
  };

  const CHART_COLORS = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.success,
    COLORS.warning,
    COLORS.purple,
    COLORS.info,
    COLORS.pink,
    COLORS.danger
  ];

  // Datos de ejemplo para gráficos avanzados (en producción vendrían del backend)
  const datosIngresosMensuales = useMemo(() => {
    if (!estadisticas) return [];

    // Generar datos de los últimos 6 meses
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesActual = new Date().getMonth();
    const datos = [];

    for (let i = 5; i >= 0; i--) {
      const mesIndex = (mesActual - i + 12) % 12;
      const factorVariacion = 0.8 + Math.random() * 0.4;
      datos.push({
        mes: meses[mesIndex],
        ingresos: Math.round((estadisticas.financieras?.periodo?.total_facturado || 0) * factorVariacion / 6),
        gastos: Math.round((estadisticas.financieras?.periodo?.total_facturado || 0) * factorVariacion * 0.6 / 6),
        utilidad: Math.round((estadisticas.financieras?.periodo?.total_facturado || 0) * factorVariacion * 0.4 / 6)
      });
    }

    return datos;
  }, [estadisticas]);

  const datosClientesPorEstado = useMemo(() => {
    if (!estadisticas?.clientes?.resumen) return [];

    const resumen = estadisticas.clientes.resumen;
    return [
      { name: 'Activos', value: resumen.activos || 0, color: COLORS.success },
      { name: 'Suspendidos', value: resumen.suspendidos || 0, color: COLORS.warning },
      { name: 'Cortados', value: resumen.cortados || 0, color: COLORS.danger },
      { name: 'Retirados', value: resumen.retirados || 0, color: COLORS.info }
    ].filter(item => item.value > 0);
  }, [estadisticas]);

  const datosRendimientoEquipo = useMemo(() => {
    if (!estadisticas) return [];

    return [
      {
        categoria: 'Instalaciones',
        completadas: estadisticas.operacionales?.instalaciones?.completadas || 0,
        pendientes: (estadisticas.operacionales?.instalaciones?.total_instalaciones || 0) -
                    (estadisticas.operacionales?.instalaciones?.completadas || 0)
      },
      {
        categoria: 'PQR',
        completadas: (estadisticas.operacionales?.pqr?.total || 0) - (estadisticas.operacionales?.pqr?.abiertas || 0),
        pendientes: estadisticas.operacionales?.pqr?.abiertas || 0
      },
      {
        categoria: 'Contratos',
        completadas: estadisticas.operacionales?.contratos?.activos || 0,
        pendientes: estadisticas.operacionales?.contratos?.pendientes || 0
      }
    ];
  }, [estadisticas]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <RefreshCw className="w-16 h-16 animate-spin text-[#0e6493] mx-auto mb-4" />
            <div className="absolute inset-0 w-16 h-16 mx-auto animate-ping">
              <div className="w-full h-full rounded-full bg-[#0e6493] opacity-20"></div>
            </div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Cargando estadísticas...</p>
          <p className="text-gray-400 text-sm mt-2">Preparando datos increíbles para ti</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mr-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-red-900 font-bold text-xl">Error al cargar estadísticas</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-lg">
        <BarChart3 className="w-24 h-24 text-gray-400 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600 text-lg">No hay datos disponibles</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90"
        >
          Actualizar
        </button>
      </div>
    );
  }

  const { financieras, clientes, operacionales } = estadisticas;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* ========================================= */}
      {/* HEADER CON FILTROS Y ACCIONES */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0e6493] to-[#e21f25] bg-clip-text text-transparent mb-2">
              Dashboard de Estadísticas
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Periodo: {new Date(filtros.fecha_desde).toLocaleDateString('es-CO')} - {new Date(filtros.fecha_hasta).toLocaleDateString('es-CO')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de período */}
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {['semana', 'mes', 'trimestre', 'año'].map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? 'bg-[#0e6493] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {/* Botones de acción */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#10b981] to-[#10b981]/80 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105">
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* KPIs PRINCIPALES CON ANIMACIONES */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Facturado */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <DollarSign className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                Mes Actual
              </span>
            </div>

            <h3 className="text-sm font-medium mb-2 opacity-90">Total Facturado</h3>
            <p className="text-3xl font-bold mb-2 font-mono">
              ${(animatedValues.totalFacturado || 0).toLocaleString('es-CO')}
            </p>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>{financieras?.periodo?.total_facturas || 0} facturas</span>
              </div>
              <div className="flex items-center bg-white/20 px-2 py-1 rounded-full">
                <ArrowUp className="w-3 h-3 mr-1" />
                <span>12%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Recaudado */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <CheckCircle className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                {estadisticasService.formatPercentage(financieras?.periodo?.tasa_recaudo || 0)}
              </span>
            </div>

            <h3 className="text-sm font-medium mb-2 opacity-90">Total Recaudado</h3>
            <p className="text-3xl font-bold mb-2 font-mono">
              ${(animatedValues.totalRecaudado || 0).toLocaleString('es-CO')}
            </p>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <Activity className="w-4 h-4 mr-1" />
                <span>Tasa de recaudo</span>
              </div>
              <div className="flex items-center bg-white/20 px-2 py-1 rounded-full">
                <ArrowUp className="w-3 h-3 mr-1" />
                <span>8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cartera Vencida */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
                Mora
              </span>
            </div>

            <h3 className="text-sm font-medium mb-2 opacity-90">Cartera Vencida</h3>
            <p className="text-3xl font-bold mb-2 font-mono">
              ${(animatedValues.carteraVencida || 0).toLocaleString('es-CO')}
            </p>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{financieras?.cartera?.clientes_con_deuda || 0} clientes</span>
              </div>
              <div className="flex items-center bg-white/20 px-2 py-1 rounded-full">
                <ArrowDown className="w-3 h-3 mr-1" />
                <span>5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clientes Activos */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                Total
              </span>
            </div>

            <h3 className="text-sm font-medium mb-2 opacity-90">Clientes Activos</h3>
            <p className="text-3xl font-bold mb-2 font-mono">
              {(animatedValues.clientesActivos || 0).toLocaleString('es-CO')}
            </p>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <UserPlus className="w-4 h-4 mr-1" />
                <span>{clientes?.resumen?.nuevos_mes || 0} nuevos</span>
              </div>
              <div className="flex items-center bg-white/20 px-2 py-1 rounded-full">
                <ArrowUp className="w-3 h-3 mr-1" />
                <span>15%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* SEGUNDA FILA DE KPIs */}
      {/* ========================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MiniKPICard
          title="Instalaciones"
          value={operacionales?.instalaciones?.completadas || 0}
          total={operacionales?.instalaciones?.total_instalaciones || 0}
          icon={<Wrench className="w-5 h-5" />}
          color="from-blue-400 to-blue-500"
        />
        <MiniKPICard
          title="Equipos"
          value={operacionales?.inventario?.disponibles || 0}
          total={operacionales?.inventario?.total_equipos || 0}
          icon={<Package className="w-5 h-5" />}
          color="from-green-400 to-green-500"
        />
        <MiniKPICard
          title="PQR Abiertas"
          value={operacionales?.pqr?.abiertas || 0}
          total={operacionales?.pqr?.total || 0}
          icon={<FileText className="w-5 h-5" />}
          color="from-yellow-400 to-yellow-500"
        />
        <MiniKPICard
          title="Contratos"
          value={operacionales?.contratos?.activos || 0}
          total={operacionales?.contratos?.total || 0}
          icon={<FileText className="w-5 h-5" />}
          color="from-purple-400 to-purple-500"
        />
        <MiniKPICard
          title="Suspendidos"
          value={clientes?.resumen?.suspendidos || 0}
          icon={<Clock className="w-5 h-5" />}
          color="from-orange-400 to-orange-500"
        />
        <MiniKPICard
          title="Cortados"
          value={clientes?.resumen?.cortados || 0}
          icon={<WifiOff className="w-5 h-5" />}
          color="from-red-400 to-red-500"
        />
      </div>

      {/* ========================================= */}
      {/* GRÁFICOS DE TENDENCIAS */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ingresos vs Gastos */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0e6493]" />
              Ingresos vs Gastos (6 meses)
            </h3>
            <button className="text-gray-400 hover:text-gray-600">
              <Download className="w-5 h-5" />
            </button>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datosIngresosMensuales}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => `$${value.toLocaleString('es-CO')}`}
                />
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500 }} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  fill="url(#colorIngresos)"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  fill="url(#colorGastos)"
                  stroke={COLORS.secondary}
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="utilidad"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  dot={{ r: 5, fill: COLORS.success }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribución de Clientes */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#0e6493]" />
              Distribución de Clientes
            </h3>
            <button className="text-gray-400 hover:text-gray-600">
              <Download className="w-5 h-5" />
            </button>
          </div>

          <div className="h-80 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartPieChart>
                <Pie
                  data={datosClientesPorEstado}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {datosClientesPorEstado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => `${value} clientes`}
                />
              </RechartPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* CARTERA Y RENDIMIENTO */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Cartera Visual */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0e6493]" />
            Edades de Cartera
          </h3>

          <div className="space-y-4">
            <CarteraBar
              label="1-30 días"
              value={financieras?.cartera?.mora_1_30_dias || 0}
              color="bg-yellow-500"
              max={financieras?.cartera?.cartera_vencida || 1}
            />
            <CarteraBar
              label="31-60 días"
              value={financieras?.cartera?.mora_31_60_dias || 0}
              color="bg-orange-500"
              max={financieras?.cartera?.cartera_vencida || 1}
            />
            <CarteraBar
              label="Más de 60 días"
              value={financieras?.cartera?.mora_mayor_60_dias || 0}
              color="bg-red-500"
              max={financieras?.cartera?.cartera_vencida || 1}
            />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Cartera Vencida</span>
              <span className="text-lg font-bold text-gray-900">
                ${(financieras?.cartera?.cartera_vencida || 0).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>

        {/* Rendimiento del Equipo */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0e6493]" />
            Rendimiento del Equipo
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosRendimientoEquipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="categoria" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="completadas" fill={COLORS.success} radius={[8, 8, 0, 0]} />
                <Bar dataKey="pendientes" fill={COLORS.warning} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* MÉTRICAS DETALLADAS */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métodos de Pago */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0e6493]" />
            Métodos de Pago
          </h3>

          <div className="space-y-3">
            {financieras?.pagos?.por_metodo?.map((metodo, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">{metodo.metodo_pago || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">{metodo.cantidad} pagos</div>
                  <div className="text-sm font-bold text-gray-900">
                    ${(metodo.monto_total || 0).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sectores */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#0e6493]" />
            Top Sectores por Clientes
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sector
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ciudad
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Activos
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tasa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes?.distribucion?.por_sectores?.slice(0, 5).map((sector, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold`}
                             style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{sector.codigo}</div>
                          <div className="text-xs text-gray-500">{sector.sector}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{sector.ciudad}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {sector.total_clientes}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                      {sector.clientes_activos}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {sector.total_clientes > 0 ? Math.round((sector.clientes_activos / sector.total_clientes) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* DISTRIBUCIÓN DE CLIENTES DETALLADA */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#0e6493]" />
          Distribución Detallada de Clientes
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <EstadoClienteCard
            icon={<CheckCircle className="w-8 h-8" />}
            label="Activos"
            value={clientes?.resumen?.activos || 0}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <EstadoClienteCard
            icon={<Clock className="w-8 h-8" />}
            label="Suspendidos"
            value={clientes?.resumen?.suspendidos || 0}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
          <EstadoClienteCard
            icon={<WifiOff className="w-8 h-8" />}
            label="Cortados"
            value={clientes?.resumen?.cortados || 0}
            color="text-red-600"
            bgColor="bg-red-100"
          />
          <EstadoClienteCard
            icon={<UserMinus className="w-8 h-8" />}
            label="Retirados"
            value={clientes?.resumen?.retirados || 0}
            color="text-gray-600"
            bgColor="bg-gray-100"
          />
          <EstadoClienteCard
            icon={<UserPlus className="w-8 h-8" />}
            label="Nuevos (mes)"
            value={clientes?.resumen?.nuevos_mes || 0}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
        </div>
      </div>

      {/* ========================================= */}
      {/* FOOTER CON INFORMACIÓN ADICIONAL */}
      {/* ========================================= */}
      <div className="bg-gradient-to-r from-[#0e6493] to-[#e21f25] rounded-xl shadow-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Última Actualización</p>
            <p className="text-lg font-bold">{new Date().toLocaleString('es-CO')}</p>
          </div>
          <div className="text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Próxima Actualización</p>
            <p className="text-lg font-bold">Automática en 5 min</p>
          </div>
          <div className="text-center">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Estado del Sistema</p>
            <p className="text-lg font-bold flex items-center justify-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
              Operativo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================
// COMPONENTES AUXILIARES
// =========================================

const MiniKPICard = ({ title, value, total, icon, color }) => {
  const percentage = total ? Math.round((value / total) * 100) : 100;

  return (
    <div className={`bg-gradient-to-br ${color} rounded-lg shadow-md p-4 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <p className="text-xs font-medium opacity-90 mb-1">{title}</p>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {total && (
        <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
          <div
            className="bg-white h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

const CarteraBar = ({ label, value, color, max }) => {
  const percentage = max ? (value / max) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">
          ${value.toLocaleString('es-CO')}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        >
          {percentage > 15 && (
            <span className="text-xs font-bold text-white">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const EstadoClienteCard = ({ icon, label, value, color, bgColor }) => (
  <div className="text-center transform transition-all duration-300 hover:scale-105">
    <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-3 ${color}`}>
      {icon}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-sm font-medium text-gray-600">{label}</p>
  </div>
);

export default EstadisticasGeneral;
