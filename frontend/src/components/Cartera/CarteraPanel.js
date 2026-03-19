// frontend/src/components/Cartera/CarteraPanel.js
// Panel de cartera vencida para secretarias y supervisores

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Search, Bell, BellRing, RefreshCw, Phone,
  ChevronDown, ChevronUp, FileText, Users, DollarSign, Clock,
  X, CheckCircle, Send
} from 'lucide-react';
import { formatCOP } from '../../utils/formatCurrency';

const API_BASE = '/api/v1/cartera';

const fetchCartera = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/morosos${query ? '?' + query : ''}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return res.json();
};

const fetchFacturasCliente = async (clienteId) => {
  const res = await fetch(`${API_BASE}/morosos/${clienteId}/facturas`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return res.json();
};

const enviarNotificacion = async (clienteId, observaciones) => {
  const res = await fetch(`${API_BASE}/notificar/${clienteId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ observaciones })
  });
  return res.json();
};

const notificarMasivo = async () => {
  const res = await fetch(`${API_BASE}/notificar-masivo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return res.json();
};

// Calcula color según días de mora
const colorMora = (dias) => {
  if (dias <= 30) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (dias <= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const badgeMora = (dias) => {
  if (dias <= 30) return 'bg-yellow-100 text-yellow-800';
  if (dias <= 60) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

// Modal de notificación
const ModalNotificar = ({ cliente, onClose, onSuccess }) => {
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      const res = await enviarNotificacion(cliente.id, observaciones);
      if (res.success) {
        setEnviado(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        alert(res.message || 'Error enviando notificación');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-[#0e6493]" />
            Registrar gestión de cobro
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-medium text-blue-900">{cliente.nombre}</p>
          <p className="text-sm text-blue-700">ID: {cliente.identificacion} | Tel: {cliente.telefono}</p>
          <p className="text-sm text-blue-700 font-semibold mt-1">
            {cliente.facturas_vencidas} facturas vencidas · Deuda: {formatCOP(cliente.total_deuda)}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones de la gestión (opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] text-sm"
            placeholder="Ej: Se intentó contactar por teléfono, no contestó. Se enviará WhatsApp..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={enviando || enviado}
            className="flex-1 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 text-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {enviado ? (
              <><CheckCircle className="w-4 h-4" /> Registrado</>
            ) : enviando ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Registrando...</>
            ) : (
              <><Send className="w-4 h-4" /> Registrar gestión</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Fila expandible de cliente moroso
const FilaCliente = ({ cliente, onNotificar }) => {
  const [expandido, setExpandido] = useState(false);
  const [facturas, setFacturas] = useState([]);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);

  const toggleExpansion = async () => {
    if (!expandido && facturas.length === 0) {
      setCargandoFacturas(true);
      try {
        const res = await fetchFacturasCliente(cliente.id);
        if (res.success) setFacturas(res.data);
      } catch {}
      setCargandoFacturas(false);
    }
    setExpandido(!expandido);
  };

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{cliente.nombre}</p>
            <p className="text-xs text-gray-500">{cliente.identificacion}</p>
            {cliente.ciudad_nombre && (
              <p className="text-xs text-gray-400">{cliente.ciudad_nombre}</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <a href={`tel:${cliente.telefono}`} className="text-sm text-[#0e6493] hover:underline flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {cliente.telefono}
          </a>
          {cliente.email && (
            <p className="text-xs text-gray-400 mt-0.5">{cliente.email}</p>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <FileText className="w-3 h-3 mr-1" />
            {cliente.facturas_vencidas}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <p className="font-bold text-red-700 text-sm">{formatCOP(cliente.total_deuda)}</p>
          {cliente.mora_1_30 > 0 && (
            <p className="text-xs text-yellow-600">1-30d: {formatCOP(cliente.mora_1_30)}</p>
          )}
          {cliente.mora_31_60 > 0 && (
            <p className="text-xs text-orange-600">31-60d: {formatCOP(cliente.mora_31_60)}</p>
          )}
          {cliente.mora_mayor_60 > 0 && (
            <p className="text-xs text-red-600">&gt;60d: {formatCOP(cliente.mora_mayor_60)}</p>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeMora(cliente.dias_mora_max)}`}>
            <Clock className="w-3 h-3 mr-1" />
            {cliente.dias_mora_max} días
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNotificar(cliente)}
              title="Registrar gestión de cobro"
              className="p-1.5 bg-[#0e6493]/10 hover:bg-[#0e6493]/20 text-[#0e6493] rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={toggleExpansion}
              title="Ver facturas"
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            >
              {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Fila expandida con facturas */}
      {expandido && (
        <tr className="bg-blue-50/50">
          <td colSpan={6} className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Facturas vencidas de {cliente.nombre}
            </p>
            {cargandoFacturas ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando...
              </div>
            ) : facturas.length === 0 ? (
              <p className="text-sm text-gray-500">No se encontraron facturas</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {facturas.map(f => (
                  <div key={f.id} className={`p-3 rounded-lg border text-xs ${colorMora(f.dias_vencida)}`}>
                    <p className="font-semibold">{f.numero_factura}</p>
                    <p>Período: {f.periodo_facturacion}</p>
                    <p>Vencida: {f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-CO') : '-'}</p>
                    <p className="font-bold mt-1">{formatCOP(f.total)}</p>
                    <p className="mt-0.5">
                      <span className="font-medium">{f.dias_vencida} días</span> vencida
                    </p>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

// Panel principal
const CarteraPanel = () => {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [search, setSearch] = useState('');
  const [clienteNotificar, setClienteNotificar] = useState(null);
  const [notificandoMasivo, setNotificandoMasivo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await fetchCartera(params);
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Error cargando cartera:', err);
    } finally {
      setCargando(false);
    }
  }, [search]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Debounce en búsqueda
  useEffect(() => {
    const t = setTimeout(() => cargarDatos(), 500);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  const handleNotificarMasivo = async () => {
    if (!window.confirm('¿Generar notificaciones de cobro para todos los clientes morosos?')) return;
    setNotificandoMasivo(true);
    try {
      const res = await notificarMasivo();
      if (res.success) {
        setMensajeExito(res.message);
        setTimeout(() => setMensajeExito(''), 4000);
      }
    } catch {}
    setNotificandoMasivo(false);
  };

  const stats = data?.estadisticas || {};
  const morosos = data?.morosos || [];

  return (
    <div className="space-y-6">
      {/* Mensaje de éxito */}
      {mensajeExito && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckCircle className="w-4 h-4" />
          {mensajeExito}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Clientes morosos</p>
              <p className="text-2xl font-bold text-red-700">{stats.total_morosos || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cartera total</p>
              <p className="text-xl font-bold text-orange-700">{formatCOP(stats.cartera_total || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Facturas vencidas</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.total_facturas_vencidas || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Deuda promedio</p>
              <p className="text-xl font-bold text-blue-700">{formatCOP(stats.deuda_promedio || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Clientes con 2 o más facturas vencidas
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {morosos.length} clientes requieren gestión de cobro
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={cargarDatos}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={handleNotificarMasivo}
              disabled={notificandoMasivo || morosos.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0e6493] hover:bg-[#0e6493]/90 text-white rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              <BellRing className={`w-4 h-4 ${notificandoMasivo ? 'animate-pulse' : ''}`} />
              {notificandoMasivo ? 'Notificando...' : 'Notificar todos'}
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] text-sm"
            placeholder="Buscar por nombre, cédula o teléfono..."
          />
        </div>
      </div>

      {/* Tabla de morosos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Cargando clientes morosos...</span>
          </div>
        ) : morosos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
            <p className="text-lg font-medium text-gray-600">
              {search ? 'No se encontraron resultados' : '¡Sin clientes morosos!'}
            </p>
            <p className="text-sm mt-1">
              {search ? 'Prueba con otro término de búsqueda' : 'Todos los clientes están al día con sus pagos'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Contacto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Facturas</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Deuda</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Mora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {morosos.map(cliente => (
                  <FilaCliente
                    key={cliente.id}
                    cliente={cliente}
                    onNotificar={setClienteNotificar}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
          1–30 días de mora
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />
          31–60 días de mora
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Más de 60 días de mora
        </span>
      </div>

      {/* Modal de notificación */}
      {clienteNotificar && (
        <ModalNotificar
          cliente={clienteNotificar}
          onClose={() => setClienteNotificar(null)}
          onSuccess={() => {
            setClienteNotificar(null);
            setMensajeExito(`Gestión de cobro registrada para ${clienteNotificar.nombre}`);
            setTimeout(() => setMensajeExito(''), 4000);
          }}
        />
      )}
    </div>
  );
};

export default CarteraPanel;
