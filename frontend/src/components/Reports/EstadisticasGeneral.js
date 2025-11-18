import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Package,
  FileText, Wrench, AlertTriangle, CheckCircle, Clock,
  BarChart3, PieChart, Activity, RefreshCw, Calendar,
  ArrowUp, ArrowDown, Minus, Download, Filter, MapPin,
  Zap, Target, Award, Briefcase, PhoneCall, Mail,
  WifiOff, Wifi, UserPlus, UserMinus, TrendingUpDown,
  ShoppingCart, CreditCard, Building, Globe, Star,
  Percent, TrendingUpIcon, Shield, AlertCircle, Info
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

  const handleExportPDF = () => {
    window.print();
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

  // Datos de tendencias mensuales REALES del backend
  const datosIngresosMensuales = useMemo(() => {
    if (!estadisticas?.tendencias?.facturacion) return [];

    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return estadisticas.tendencias.facturacion.map(mes => {
      const [year, month] = mes.periodo.split('-');
      const mesIndex = parseInt(month) - 1;

      return {
        mes: mesesNombres[mesIndex],
        ingresos: parseFloat(mes.valor_total_facturado) || 0,
        recaudado: parseFloat(mes.valor_recaudado) || 0,
        pendiente: parseFloat(mes.valor_pendiente_cobro) || 0
      };
    }).slice(-6); // Últimos 6 meses
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

  // Generar alertas y recomendaciones inteligentes
  const alertasRecomendaciones = useMemo(() => {
    if (!estadisticas) return [];

    const alertas = [];

    // Alerta de cartera vencida alta
    const tasaCarteraVencida = estadisticas.financieras?.cartera?.cartera_vencida || 0;
    const totalFacturado = estadisticas.financieras?.periodo?.total_facturado || 1;
    if ((tasaCarteraVencida / totalFacturado) > 0.2) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Cartera Vencida Alta',
        mensaje: `La cartera vencida representa más del 20% de la facturación. Considere intensificar las estrategias de cobro.`,
        icono: AlertTriangle
      });
    }

    // Alerta de churn rate
    const churnRate = estadisticas.clientes?.churn?.tasa_churn || 0;
    if (churnRate > 5) {
      alertas.push({
        tipo: 'danger',
        titulo: 'Tasa de Abandono Alta',
        mensaje: `La tasa de churn es ${churnRate.toFixed(1)}%. Implemente estrategias de retención de clientes.`,
        icono: AlertCircle
      });
    }

    // Recomendación de eficiencia operativa
    const eficienciaInstalaciones = estadisticas.metricas_gerenciales?.eficiencia_operativa?.tasa_exito_instalaciones || 0;
    if (eficienciaInstalaciones < 80) {
      alertas.push({
        tipo: 'info',
        titulo: 'Oportunidad de Mejora',
        mensaje: `La tasa de éxito de instalaciones es ${eficienciaInstalaciones.toFixed(1)}%. Optimice procesos para alcanzar el 90%.`,
        icono: Info
      });
    }

    // Alerta positiva - buen desempeño
    const tasaRecaudo = estadisticas.financieras?.periodo?.tasa_recaudo || 0;
    if (tasaRecaudo > 85) {
      alertas.push({
        tipo: 'success',
        titulo: 'Excelente Recaudo',
        mensaje: `La tasa de recaudo es ${tasaRecaudo.toFixed(1)}%. ¡Continúe con las buenas prácticas de cobro!`,
        icono: CheckCircle
      });
    }

    return alertas;
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
          <p className="text-gray-400 text-sm mt-2">Preparando datos ejecutivos</p>
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

  const { financieras, clientes, operacionales, metricas_gerenciales, comparaciones } = estadisticas;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* ========================================= */}
      {/* HEADER CON FILTROS Y ACCIONES */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0e6493] to-[#e21f25] bg-clip-text text-transparent mb-2">
              Dashboard Ejecutivo
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

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#10b981] to-[#10b981]/80 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* ALERTAS Y RECOMENDACIONES */}
      {/* ========================================= */}
      {alertasRecomendaciones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertasRecomendaciones.map((alerta, index) => (
            <AlertCard key={index} {...alerta} />
          ))}
        </div>
      )}

      {/* ========================================= */}
      {/* KPIs PRINCIPALES CON COMPARACIÓN */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Facturado */}
        <KPICard
          title="Total Facturado"
          value={animatedValues.totalFacturado || 0}
          prefix="$"
          icon={<DollarSign className="w-6 h-6" />}
          color="from-blue-500 to-blue-600"
          variacion={comparaciones?.facturacion}
          subtitle={`${financieras?.periodo?.total_facturas || 0} facturas`}
        />

        {/* Total Recaudado */}
        <KPICard
          title="Total Recaudado"
          value={animatedValues.totalRecaudado || 0}
          prefix="$"
          icon={<CheckCircle className="w-6 h-6" />}
          color="from-green-500 to-green-600"
          variacion={comparaciones?.recaudo}
          subtitle={`${estadisticasService.formatPercentage(financieras?.periodo?.tasa_recaudo || 0)} tasa de recaudo`}
          badge={estadisticasService.formatPercentage(financieras?.periodo?.tasa_recaudo || 0)}
        />

        {/* Cartera Vencida */}
        <KPICard
          title="Cartera Vencida"
          value={animatedValues.carteraVencida || 0}
          prefix="$"
          icon={<AlertTriangle className="w-6 h-6" />}
          color="from-red-500 to-red-600"
          variacion={comparaciones?.cartera_vencida}
          subtitle={`${financieras?.cartera?.clientes_con_deuda || 0} clientes`}
          badge="Mora"
          invertVariation={true}
        />

        {/* Clientes Activos */}
        <KPICard
          title="Clientes Activos"
          value={animatedValues.clientesActivos || 0}
          icon={<Users className="w-6 h-6" />}
          color="from-purple-500 to-purple-600"
          variacion={comparaciones?.clientes_nuevos}
          subtitle={`${clientes?.resumen?.nuevos_mes || 0} nuevos este mes`}
        />
      </div>

      {/* ========================================= */}
      {/* MÉTRICAS GERENCIALES AVANZADAS */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricaGerencialCard
          title="ARPU"
          subtitle="Ingreso Promedio por Usuario"
          value={metricas_gerenciales?.arpu?.valor || 0}
          prefix="$"
          icon={<DollarSign className="w-5 h-5" />}
          color="bg-gradient-to-br from-blue-400 to-blue-500"
          description={`Basado en ${metricas_gerenciales?.arpu?.total_clientes || 0} clientes`}
        />

        <MetricaGerencialCard
          title="LTV"
          subtitle="Valor de Vida del Cliente"
          value={metricas_gerenciales?.ltv?.promedio || 0}
          prefix="$"
          icon={<TrendingUpIcon className="w-5 h-5" />}
          color="bg-gradient-to-br from-green-400 to-green-500"
          description="Promedio histórico"
        />

        <MetricaGerencialCard
          title="Retención"
          subtitle="Tasa de Retención"
          value={metricas_gerenciales?.retencion?.tasa || 0}
          suffix="%"
          icon={<Shield className="w-5 h-5" />}
          color="bg-gradient-to-br from-purple-400 to-purple-500"
          description={`${metricas_gerenciales?.retencion?.clientes_retenidos || 0} clientes retenidos`}
        />

        <MetricaGerencialCard
          title="DSO"
          subtitle="Días Promedio de Cobro"
          value={metricas_gerenciales?.cobro?.dso || 0}
          suffix=" días"
          icon={<Clock className="w-5 h-5" />}
          color="bg-gradient-to-br from-orange-400 to-orange-500"
          description="Days Sales Outstanding"
        />
      </div>

      {/* ========================================= */}
      {/* PROYECCIONES FINANCIERAS */}
      {/* ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#0e6493]" />
            Ingresos Recurrentes
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">MRR - Ingreso Mensual Recurrente</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(metricas_gerenciales?.proyeccion?.mrr || 0).toLocaleString('es-CO')}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">ARR - Ingreso Anual Proyectado</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(metricas_gerenciales?.proyeccion?.arr || 0).toLocaleString('es-CO')}
                </p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center text-sm text-gray-500 pt-2">
              Basado en {metricas_gerenciales?.proyeccion?.contratos_activos || 0} contratos activos
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0e6493]" />
            Indicadores de Eficiencia
          </h3>
          <div className="space-y-4">
            <IndicadorProgreso
              titulo="Tasa de Éxito Instalaciones"
              valor={metricas_gerenciales?.eficiencia_operativa?.tasa_exito_instalaciones || 0}
              meta={90}
              color="bg-blue-500"
            />
            <IndicadorProgreso
              titulo="Satisfacción del Cliente"
              valor={metricas_gerenciales?.satisfaccion_cliente?.indice || 0}
              meta={95}
              color="bg-green-500"
            />
            <IndicadorProgreso
              titulo="Tasa de Retención"
              valor={metricas_gerenciales?.retencion?.tasa || 0}
              meta={85}
              color="bg-purple-500"
            />
            <div className="text-center text-sm text-gray-500 pt-2">
              {metricas_gerenciales?.satisfaccion_cliente?.pqr_resueltas || 0} PQRs resueltas de {metricas_gerenciales?.satisfaccion_cliente?.total_pqr || 0}
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
        {/* Gráfico de Ingresos (DATOS REALES) */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0e6493]" />
              Tendencia de Ingresos (6 meses)
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
                  <linearGradient id="colorRecaudado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.1}/>
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
                  name="Facturado"
                  fill="url(#colorIngresos)"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="recaudado"
                  name="Recaudado"
                  fill="url(#colorRecaudado)"
                  stroke={COLORS.success}
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="pendiente"
                  name="Pendiente"
                  stroke={COLORS.warning}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLORS.warning }}
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
      <div className="bg-gradient-to-r from-[#0e6493] to-[#e21f25] rounded-xl shadow-lg p-6 text-white print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Última Actualización</p>
            <p className="text-lg font-bold">{new Date().toLocaleString('es-CO')}</p>
          </div>
          <div className="text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Tasa de Churn</p>
            <p className="text-lg font-bold">{(clientes?.churn?.tasa_churn || 0).toFixed(2)}%</p>
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

const KPICard = ({ title, value, prefix = '', suffix = '', icon, color, variacion, subtitle, badge, invertVariation = false }) => {
  const getVariacionColor = () => {
    if (!variacion && variacion !== 0) return 'text-gray-400';
    const isPositive = variacion > 0;
    const shouldBeGreen = invertVariation ? !isPositive : isPositive;
    return shouldBeGreen ? 'text-green-400' : 'text-red-400';
  };

  const getVariacionIcon = () => {
    if (!variacion && variacion !== 0) return <Minus className="w-3 h-3" />;
    return variacion > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className={`group relative overflow-hidden bg-gradient-to-br ${color} rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            {icon}
          </div>
          {badge && (
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-sm font-medium mb-2 opacity-90">{title}</h3>
        <p className="text-3xl font-bold mb-2 font-mono">
          {prefix}{value.toLocaleString('es-CO')}{suffix}
        </p>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <span>{subtitle}</span>
          </div>
          {(variacion || variacion === 0) && (
            <div className={`flex items-center bg-white/20 px-2 py-1 rounded-full ${getVariacionColor()}`}>
              {getVariacionIcon()}
              <span>{Math.abs(variacion).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricaGerencialCard = ({ title, subtitle, value, prefix = '', suffix = '', icon, color, description }) => {
  return (
    <div className={`${color} rounded-lg shadow-md p-4 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <p className="text-xs font-medium opacity-90 mb-1">{title}</p>
      <p className="text-xs opacity-75 mb-2">{subtitle}</p>
      <p className="text-2xl font-bold mb-1">{prefix}{value.toLocaleString('es-CO')}{suffix}</p>
      {description && (
        <p className="text-xs opacity-75">{description}</p>
      )}
    </div>
  );
};

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

const IndicadorProgreso = ({ titulo, valor, meta, color }) => {
  const porcentaje = Math.min((valor / meta) * 100, 100);
  const cumpleMeta = valor >= meta;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{titulo}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{valor.toFixed(1)}%</span>
          {cumpleMeta && <CheckCircle className="w-4 h-4 text-green-500" />}
        </div>
      </div>
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`${color} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${porcentaje}%` }}
          ></div>
        </div>
        <div className="absolute top-0 left-0 w-full h-2 flex items-center" style={{ paddingLeft: `${(meta / 100) * 100}%` }}>
          <div className="w-px h-4 bg-gray-400"></div>
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0%</span>
        <span>Meta: {meta}%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

const AlertCard = ({ tipo, titulo, mensaje, icono: Icon }) => {
  const estilos = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconosColores = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    info: 'text-blue-600'
  };

  return (
    <div className={`${estilos[tipo]} border rounded-lg p-4 flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${iconosColores[tipo]} flex-shrink-0 mt-0.5`} />
      <div>
        <h4 className="font-semibold text-sm mb-1">{titulo}</h4>
        <p className="text-xs">{mensaje}</p>
      </div>
    </div>
  );
};

export default EstadisticasGeneral;
