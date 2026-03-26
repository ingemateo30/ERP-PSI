// frontend/src/components/Contratos/ContratosList.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  PenTool,
  RefreshCw,
  TrendingUp,
  Award,
  BarChart2
} from 'lucide-react';
import contratosService from '../../services/contratosService';

// ──────────────────────────────────────────────
// DonutChart – SVG donut chart for contract states
// ──────────────────────────────────────────────
const DonutChart = ({ activos = 0, vencidos = 0, terminados = 0, anulados = 0 }) => {
  // Parse to numbers to avoid string concatenation from MySQL responses
  const _activos   = Number(activos)   || 0;
  const _vencidos  = Number(vencidos)  || 0;
  const _terminados= Number(terminados)|| 0;
  const _anulados  = Number(anulados)  || 0;
  const total = _activos + _vencidos + _terminados + _anulados;
  if (total === 0) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sin datos</div>
  );

  const segments = [
    { value: _activos,    color: '#22c55e', label: 'Activos'    },
    { value: _vencidos,   color: '#f97316', label: 'Vencidos'   },
    { value: _terminados, color: '#6b7280', label: 'Terminados' },
    { value: _anulados,   color: '#ef4444', label: 'Anulados'   },
  ];

  const R = 50, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * R;
  let cumulative = 0;

  const slices = segments.map(seg => {
    const pct = seg.value / total;
    const dash = pct * circumference;
    const gap  = circumference - dash;
    const offset = circumference - cumulative * circumference;
    cumulative += pct;
    return { ...seg, dash, gap, offset };
  });

  const pctActivos = Math.round((_activos / total) * 100);

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f3f4f6" strokeWidth="18" />
          {slices.map((s, i) => (
            s.value > 0 && (
              <circle
                key={i}
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={s.offset}
                strokeLinecap="butt"
                style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
              />
            )
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">{pctActivos}%</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#6b7280">activos</text>
        </svg>
      </div>
      <div className="space-y-2 flex-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-600">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: total > 0 ? `${(s.value/total)*100}%` : '0%', backgroundColor: s.color }} />
              </div>
              <span className="font-semibold text-gray-800 w-8 text-right">{s.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
const ContratosList = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    search: '',
    estado: '',
    tipo_contrato: '',
    page: 1,
    limit: 50
  });
  const [estadisticas, setEstadisticas] = useState(null);
  const [modalRenovar, setModalRenovar] = useState({ visible: false, contrato: null });
  const [renovarForm, setRenovarForm] = useState({ permanencia_meses: 12, observaciones: '', terminar_anterior: true });
  const [renovarLoading, setRenovarLoading] = useState(false);
  const [paginacion, setPaginacion] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 50
  });

  // Cargar contratos
  useEffect(() => {
    cargarContratos();
  }, [filtros]);

  // Cargar estadísticas al montar
  useEffect(() => {
    cargarEstadisticas();
  }, []);
const { hasPermission } = useAuth();
  const cargarContratos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contratosService.obtenerTodos(filtros);
      
      if (response.success) {
        setContratos(response.data.contratos || []);
        
        // ✅ CORRECCIÓN: Mapear correctamente la paginación
        const pag = response.data.pagination || {};
        setPaginacion({
          page: pag.page || 1,
          totalPages: pag.totalPages || 1,
          total: pag.total || 0,
          limit: pag.limit || 10
        });
      } else {
        setError(response.message || 'Error cargando contratos');
      }
    } catch (err) {
      console.error('Error cargando contratos:', err);
      setError(err.message || 'Error cargando contratos');
    } finally {
      setLoading(false);
    }
  };
  const cargarEstadisticas = async () => {
    try {
      const response = await contratosService.obtenerEstadisticas();
      if (response.success) {
        setEstadisticas(response.data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      page: 1 // Resetear página al cambiar filtros
    }));
  };

  const handleDescargarPDF = async (contratoId) => {
    try {
      await contratosService.generarPDF(contratoId, true);
    } catch (err) {
      console.error('Error descargando PDF:', err);
      alert('Error al descargar el PDF del contrato');
    }
  };

  const handleVerPDF = async (contratoId) => {
    try {
      const pdfUrl = await contratosService.obtenerUrlPDF(contratoId);
      window.open(pdfUrl, '_blank');
    } catch (err) {
      console.error('Error abriendo PDF:', err);
      alert('Error al abrir el PDF del contrato');
    }
  };

  const handleCambiarEstado = async (contratoId, nuevoEstado) => {
    try {
      const motivo = prompt(`Ingrese el motivo para cambiar a "${nuevoEstado}":`);
      if (!motivo) return;

      await contratosService.actualizarEstado(contratoId, {
        estado: nuevoEstado,
        observaciones: motivo
      });

      await cargarContratos();
      await cargarEstadisticas();

      alert('Estado del contrato actualizado exitosamente');
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert('Error al cambiar el estado del contrato');
    }
  };

  const handleIrAFirmar = (contratoId) => {
    // Redirigir a la página de firma con el ID del contrato
    window.location.href = `/firma-contratos?contratoId=${contratoId}`;
  };

  const handleAbrirRenovar = (contrato) => {
    // Regla: solo se puede renovar dentro de los 30 días anteriores al vencimiento
    let diasRestantes = null;
    let puedeRenovar = true;
    let fechaVencimiento = null;
    let sinFechaFin = false;

    const fechaFinRef = contrato.fecha_vencimiento_permanencia || contrato.fecha_fin;
    if (!fechaFinRef) {
      sinFechaFin = true;
      puedeRenovar = false;
    } else {
      fechaVencimiento = fechaFinRef;
      diasRestantes = Math.ceil((new Date(fechaFinRef) - new Date()) / (1000 * 60 * 60 * 24));
      puedeRenovar = diasRestantes <= 30;
    }

    setRenovarForm({
      permanencia_meses: contrato.permanencia_meses || 12,
      observaciones: '',
      terminar_anterior: true,
      _diasRestantes: diasRestantes,
      _puedeRenovar: puedeRenovar,
      _fechaVencimiento: fechaVencimiento,
      _sinFechaFin: sinFechaFin
    });
    setModalRenovar({ visible: true, contrato });
  };

  const handleRenovarContrato = async () => {
    try {
      setRenovarLoading(true);
      const { _diasRestantes, _puedeRenovar, _fechaVencimiento, _sinFechaFin, ...datosEnvio } = renovarForm;
      const response = await contratosService.renovarContrato(
        modalRenovar.contrato.id,
        datosEnvio
      );

      if (response.success) {
        setModalRenovar({ visible: false, contrato: null });
        await cargarContratos();
        await cargarEstadisticas();
        alert(`Contrato renovado exitosamente.\nNuevo contrato: ${response.data.numero_contrato}`);
      }
    } catch (err) {
      console.error('Error renovando contrato:', err);
      // Limpiar prefijo "Error 4xx: " que agrega el servicio
      const mensaje = err.message?.replace(/^Error \d+:\s*/, '') || 'Error al renovar el contrato';
      alert(mensaje);
    } finally {
      setRenovarLoading(false);
    }
  };

  const obtenerIconoEstado = (estado) => {
    switch (estado) {
      case 'activo':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'vencido':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'terminado':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'anulado':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-orange-100 text-orange-800';
      case 'terminado':
        return 'bg-gray-100 text-gray-800';
      case 'anulado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && contratos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Cargando contratos...</span>
      </div>
    );
  }

  const totalContratos = estadisticas?.total_contratos || 0;
  const pctFirmados   = totalContratos > 0
    ? Math.round(((estadisticas?.contratos_firmados || 0) / totalContratos) * 100)
    : 0;
  const pctActivos    = totalContratos > 0
    ? Math.round(((estadisticas?.contratos_activos || 0) / totalContratos) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {estadisticas && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">{estadisticas.total_contratos}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">contratos registrados</p>
            </div>

            {/* Activos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activos</p>
                  <p className="text-3xl font-extrabold text-green-600 mt-1">{estadisticas.contratos_activos}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>del total</span><span className="font-medium text-green-600">{pctActivos}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pctActivos}%` }} />
                </div>
              </div>
            </div>

            {/* Vencidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vencidos</p>
                  <p className="text-3xl font-extrabold text-orange-500 mt-1">{estadisticas.contratos_vencidos}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">requieren atención</p>
            </div>

            {/* Firmados */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Firmados</p>
                  <p className="text-3xl font-extrabold text-purple-600 mt-1">{estadisticas.contratos_firmados}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>tasa de firma</span><span className="font-medium text-purple-600">{pctFirmados}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${pctFirmados}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Donut chart + breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-[#0e6493]" />
              <h3 className="text-base font-semibold text-gray-900">Distribución por Estado</h3>
            </div>
            <DonutChart
              activos={estadisticas.contratos_activos || 0}
              vencidos={estadisticas.contratos_vencidos || 0}
              terminados={estadisticas.contratos_terminados || 0}
              anulados={estadisticas.contratos_anulados || 0}
            />
          </div>
        </>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={filtros.search}
                onChange={(e) => handleFiltroChange('search', e.target.value)}
                placeholder="Número, cliente, identificación..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="vencido">Vencido</option>
              <option value="terminado">Terminado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={filtros.tipo_contrato}
              onChange={(e) => handleFiltroChange('tipo_contrato', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="servicio">Servicio</option>
              <option value="permanencia">Permanencia</option>
              <option value="comercial">Comercial</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registros por página
            </label>
            <select
              value={filtros.limit}
              onChange={(e) => handleFiltroChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setFiltros({
              search: '',
              estado: '',
              tipo_contrato: '',
              page: 1,
              limit: 50
            })}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de contratos */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">

        {/* Vista móvil: tarjetas */}
        <div className="block md:hidden divide-y divide-gray-200">
          {contratos.map((contrato) => (
            <div key={contrato.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{contrato.numero_contrato}</p>
                  <p className="text-xs text-gray-500">{contrato.tipo_contrato}</p>
                </div>
                <div className="flex items-center ml-2">
                  {obtenerIconoEstado(contrato.estado)}
                  <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${obtenerColorEstado(contrato.estado)}`}>
                    {contrato.estado}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600 space-y-1 mb-3">
                <p><span className="font-medium">Cliente:</span> {contrato.cliente_nombre}</p>
                <p><span className="font-medium">Plan:</span> {contrato.plan_nombre || 'N/A'}</p>
                <p><span className="font-medium">Permanencia:</span> {contrato.tipo_permanencia === 'con_permanencia' ? `${contrato.permanencia_meses || 0} meses` : 'Sin permanencia'}</p>
                <p><span className="font-medium">Fecha:</span> {contrato.fecha_generacion ? new Date(String(contrato.fecha_generacion).substring(0,10) + 'T12:00:00').toLocaleDateString('es-CO') : 'N/A'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleVerPDF(contrato.id)} className="text-indigo-600 hover:text-indigo-900" title="Ver PDF"><Eye className="w-4 h-4" /></button>
                <button onClick={() => handleDescargarPDF(contrato.id)} className="text-blue-600 hover:text-blue-900" title="Descargar"><Download className="w-4 h-4" /></button>
                {!contrato.firmado_cliente && contrato.estado !== 'anulado' && (
                  <button onClick={() => handleIrAFirmar(contrato.id)} className="text-green-600 hover:text-green-900" title="Firmar"><PenTool className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Vista desktop: tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permanencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contratos.map((contrato) => (
                <tr key={contrato.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contrato.numero_contrato}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contrato.tipo_contrato}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contrato.cliente_nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contrato.cliente_identificacion}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contrato.plan_nombre || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contrato.plan_precio ? 
                          new Intl.NumberFormat('es-CO', { 
                            style: 'currency', 
                            currency: 'COP' 
                          }).format(contrato.plan_precio)
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {obtenerIconoEstado(contrato.estado)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerColorEstado(contrato.estado)}`}>
                        {contrato.estado}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contrato.tipo_permanencia === 'con_permanencia' 
                      ? `${contrato.permanencia_meses || 0} meses`
                      : 'Sin permanencia'
                    }
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contrato.fecha_generacion ? 
                      new Date(String(contrato.fecha_generacion).substring(0,10) + 'T12:00:00').toLocaleDateString('es-CO')
                      : 'N/A'
                    }
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {contrato.firmado_cliente ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" title="Contrato firmado">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Firmado
                        </span>
                      ) : contrato.estado !== 'anulado' && (
                        <button
                          onClick={() => handleIrAFirmar(contrato.id)}
                          className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                          title="Firmar contrato"
                        >
                          <PenTool className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleVerPDF(contrato.id)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                        title="Ver PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDescargarPDF(contrato.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
{(hasPermission('administrador') || hasPermission('supervisor') || hasPermission('secretaria')) && contrato.estado === 'activo' && (
  <button
    onClick={() => handleAbrirRenovar(contrato)}
    className="text-teal-600 hover:text-teal-900 p-1 rounded transition-colors"
    title="Renovar contrato"
  >
    <RefreshCw className="w-4 h-4" />
  </button>
)}

{hasPermission('administrador') && contrato.estado === 'activo' && (
  <button
    onClick={() => handleCambiarEstado(contrato.id, 'terminado')}
    className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors"
    title="Terminar contrato"
  >
    <XCircle className="w-4 h-4" />
  </button>
)}

{hasPermission('administrador') && contrato.estado !== 'anulado' && (
  <button
    onClick={() => handleCambiarEstado(contrato.id, 'anulado')}
    className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
    title="Anular contrato"
  >
    <AlertTriangle className="w-4 h-4" />
  </button>
)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>{/* fin desktop */}

        {/* Paginación */}
        {paginacion.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handleFiltroChange('page', Math.max(1, filtros.page - 1))}
                  disabled={filtros.page <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handleFiltroChange('page', Math.min(paginacion.totalPages, filtros.page + 1))}
                  disabled={filtros.page >= paginacion.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {((filtros.page - 1) * filtros.limit) + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(filtros.page * filtros.limit, paginacion.total)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{paginacion.total}</span>{' '}
                    resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handleFiltroChange('page', Math.max(1, filtros.page - 1))}
                      disabled={filtros.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handleFiltroChange('page', Math.min(paginacion.totalPages, filtros.page + 1))}
                      disabled={filtros.page >= paginacion.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mensaje si no hay contratos */}
      {!loading && contratos.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay contratos</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filtros.search || filtros.estado || filtros.tipo_contrato
              ? 'No se encontraron contratos con los filtros aplicados.'
              : 'Aún no se han generado contratos en el sistema.'
            }
          </p>
        </div>
      )}

      {/* Modal Renovar Contrato */}
      {modalRenovar.visible && modalRenovar.contrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-gray-900">Renovar Contrato</h2>
              </div>
              <button
                onClick={() => setModalRenovar({ visible: false, contrato: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-700">Contrato actual:</p>
                <p className="text-gray-600">{modalRenovar.contrato.numero_contrato} — {modalRenovar.contrato.cliente_nombre}</p>
                <p className="text-gray-500">{modalRenovar.contrato.plan_nombre}</p>
              </div>

              {/* Bloque de estado de renovación — aplica a TODOS los contratos */}
              {renovarForm._sinFechaFin ? (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800">
                  <p className="font-medium">🚫 Renovación no permitida</p>
                  <p>Este contrato no tiene fecha de vencimiento definida. La renovación solo aplica a contratos con una fecha de fin establecida.</p>
                </div>
              ) : renovarForm._puedeRenovar ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <p className="font-medium">✅ Renovación disponible</p>
                  <p>
                    {renovarForm._diasRestantes <= 0
                      ? 'El contrato ya venció — puede renovarse.'
                      : `Quedan ${renovarForm._diasRestantes} día(s) para el vencimiento — dentro del período permitido (≤ 30 días).`}
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium">⚠️ Renovación no disponible aún</p>
                  <p>
                    Quedan <strong>{renovarForm._diasRestantes} días</strong> para el vencimiento.
                    Solo se puede renovar dentro de los <strong>30 días anteriores</strong> al vencimiento.
                  </p>
                  {renovarForm._fechaVencimiento && (
                    <p className="mt-1">
                      Fecha de vencimiento:{' '}
                      <strong>
                        {new Date(renovarForm._fechaVencimiento).toLocaleDateString('es-CO', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </strong>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-amber-600">
                    Podrá renovar a partir del{' '}
                    {new Date(new Date(renovarForm._fechaVencimiento).getTime() - 30 * 24 * 60 * 60 * 1000)
                      .toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meses de permanencia del nuevo contrato
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={renovarForm.permanencia_meses}
                  onChange={(e) => setRenovarForm(prev => ({ ...prev, permanencia_meses: parseInt(e.target.value) || 12 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={renovarForm.observaciones}
                  onChange={(e) => setRenovarForm(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder={`Renovación del contrato ${modalRenovar.contrato.numero_contrato}`}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="terminarAnterior"
                  checked={renovarForm.terminar_anterior}
                  onChange={(e) => setRenovarForm(prev => ({ ...prev, terminar_anterior: e.target.checked }))}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="terminarAnterior" className="text-sm text-gray-700">
                  Marcar contrato anterior como terminado
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setModalRenovar({ visible: false, contrato: null })}
                disabled={renovarLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRenovarContrato}
                disabled={renovarLoading || !renovarForm._puedeRenovar}
                title={!renovarForm._puedeRenovar && !renovarForm._sinFechaFin ? `Podrá renovar dentro de ${renovarForm._diasRestantes - 30} días más` : ''}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renovarLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Renovando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Renovar Contrato
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContratosList;