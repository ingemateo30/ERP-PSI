// frontend/src/components/Clients/ClientModal.js

import React, { useState, useEffect } from 'react';
import {
  X, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  User, CreditCard, Wifi, Settings, AlertTriangle,
  CheckCircle, Clock, XCircle, FileText, DollarSign,
  Package, Activity, ChevronRight, Loader, RefreshCw,
  Plus, Save, RotateCcw
} from 'lucide-react';
import { clientService } from '../../services/clientService';
import ClientServiceManager from './ClientServiceManager';

const TABS = [
  { id: 'personal',  label: 'Personal',   icon: User },
  { id: 'tecnico',   label: 'Técnico',     icon: Settings },
  { id: 'servicios', label: 'Servicios',   icon: Wifi },
  { id: 'facturas',  label: 'Facturas',    icon: DollarSign },
  { id: 'contratos', label: 'Contratos',   icon: FileText },
];

const ClientModal = ({ client, onClose, onEdit, onDelete, onCambiarEstado, permissions }) => {
  const [deleting, setDeleting]                   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showServiceManager, setShowServiceManager] = useState(false);
  const [showCambiarEstado, setShowCambiarEstado] = useState(false);
  const [activeTab, setActiveTab]                 = useState('personal');
  const [clienteCompleto, setClienteCompleto]     = useState(null);
  const [loadingCompleto, setLoadingCompleto]     = useState(false);
  const [variosRecurrentes, setVariosRecurrentes] = useState([]);
  const [loadingVarios, setLoadingVarios]         = useState(false);
  const [showVariosForm, setShowVariosForm]       = useState(false);
  const [editingVarios, setEditingVarios]         = useState(null);
  const [variosForm, setVariosForm]               = useState({ concepto: '', cantidad: 1, valor_unitario: '', aplica_iva: true, porcentaje_iva: 19 });

  /* ──────────────────── helpers ──────────────────── */

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    try {
      const datePart = dateString.split('T')[0].split(' ')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      if (!year || !month || !day) return 'Fecha inválida';
      return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return 'Fecha inválida'; }
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const c = phone.replace(/\D/g, '');
    return (c.length === 10 && c.startsWith('3'))
      ? `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`
      : phone;
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(Number(val) || 0));

  const getStateBadge = (state) => {
    const map = {
      activo:     'bg-green-100 text-green-800 border-green-200',
      suspendido: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cortado:    'bg-red-100 text-red-800 border-red-200',
      inactivo:   'bg-gray-100 text-gray-800 border-gray-200',
      cancelado:  'bg-gray-100 text-gray-800 border-gray-200',
    };
    return map[state] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStateIcon = (state) => {
    const icons = { activo: CheckCircle, suspendido: Clock, cortado: XCircle, inactivo: AlertTriangle };
    const I = icons[state] || AlertTriangle;
    return <I className="w-4 h-4" />;
  };

  const getFacturaBadge = (estado) => {
    const map = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      pagada:    'bg-green-100 text-green-800',
      vencida:   'bg-red-100 text-red-800',
      anulada:   'bg-gray-100 text-gray-600',
    };
    return map[estado] || 'bg-gray-100 text-gray-800';
  };

  /* ──────────────────── data fetch ──────────────────── */

  useEffect(() => {
    if (!client?.id) return;
    setLoadingCompleto(true);
    const token = localStorage.getItem('accessToken');
    const base = process.env.REACT_APP_API_URL;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${base}/clientes-completo/${client.id}/servicios`, { headers }).then(r => r.json()),
      fetch(`${base}/clientes-completo/facturas?cliente_id=${client.id}&limit=20`, { headers }).then(r => r.json()),
      fetch(`${base}/clientes-completo/contratos?cliente_id=${client.id}&limit=20`, { headers }).then(r => r.json()),
    ])
      .then(([srvRes, facRes, conRes]) => {
        setClienteCompleto({
          servicios: srvRes.success ? (srvRes.data || []) : [],
          facturas:  facRes.success ? (facRes.data?.facturas || []) : [],
          contratos: conRes.success ? (conRes.data?.contratos || conRes.data || []) : [],
        });
      })
      .catch(() => {})
      .finally(() => setLoadingCompleto(false));
  }, [client?.id]);

  /* ──────────────────── varios recurrentes ──────────────────── */

  const fetchVariosRecurrentes = async () => {
    if (!client?.id) return;
    setLoadingVarios(true);
    try {
      const token = localStorage.getItem('accessToken');
      const r = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${client.id}/varios-recurrentes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const res = await r.json();
      setVariosRecurrentes(res.success ? (res.data || []) : []);
    } catch { setVariosRecurrentes([]); }
    finally { setLoadingVarios(false); }
  };

  useEffect(() => { fetchVariosRecurrentes(); }, [client?.id]);

  const handleGuardarVarios = async () => {
    if (!variosForm.concepto || !variosForm.valor_unitario) return;
    const token = localStorage.getItem('accessToken');
    const base = process.env.REACT_APP_API_URL;
    const url = editingVarios
      ? `${base}/clientes/${client.id}/varios-recurrentes/${editingVarios.id}`
      : `${base}/clientes/${client.id}/varios-recurrentes`;
    const method = editingVarios ? 'PUT' : 'POST';
    try {
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(variosForm)
      });
      const res = await r.json();
      if (res.success) {
        await fetchVariosRecurrentes();
        setShowVariosForm(false);
        setEditingVarios(null);
        setVariosForm({ concepto: '', cantidad: 1, valor_unitario: '', aplica_iva: true, porcentaje_iva: 19 });
        window.showNotification?.('success', editingVarios ? 'Concepto actualizado' : 'Concepto recurrente agregado');
      }
    } catch { window.showNotification?.('error', 'Error al guardar el concepto'); }
  };

  const handleEliminarVarios = async (v) => {
    if (!window.confirm(`¿Eliminar concepto "${v.concepto}"?`)) return;
    const token = localStorage.getItem('accessToken');
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${client.id}/varios-recurrentes/${v.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const res = await r.json();
      if (res.success) { await fetchVariosRecurrentes(); window.showNotification?.('success', 'Concepto eliminado'); }
    } catch { window.showNotification?.('error', 'Error al eliminar'); }
  };

  /* ──────────────────── delete ──────────────────── */

  const handleDelete = async () => {
    if (!permissions.canDelete) { alert('No tienes permisos para eliminar clientes'); return; }
    setDeleting(true);
    try {
      const response = await clientService.deleteClient(client.id);
      if (response.success) {
        window.showNotification?.('success', response.message || 'Cliente eliminado exitosamente');
        onDelete(); onClose();
      } else throw new Error(response.message || 'Error al eliminar cliente');
    } catch (error) {
      window.showNotification
        ? window.showNotification('error', error.message)
        : alert(error.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  /* ──────────────────── render helpers ──────────────────── */

  const InfoRow = ({ label, value, className = '' }) => (
    <div className={className}>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || <span className="text-gray-400 italic">No especificado</span>}</p>
    </div>
  );

  /* ════════════════════════════ TABS ════════════════════════════ */

  const TabPersonal = () => (
    <div className="space-y-6">
      {/* Datos personales */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-[#0e6493]" /> Datos Personales
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Nombre completo" value={client.nombre} className="col-span-2" />
          <InfoRow label="Tipo documento"
            value={
              client.tipo_documento === 'cedula' ? 'Cédula de Ciudadanía' :
              client.tipo_documento === 'nit' ? 'NIT' :
              client.tipo_documento === 'pasaporte' ? 'Pasaporte' :
              client.tipo_documento === 'extranjeria' ? 'Cédula Extranjería' :
              client.tipo_documento
            }
          />
          <InfoRow label="Identificación" value={client.identificacion} />
          {client.estrato && <InfoRow label="Estrato" value={`Estrato ${client.estrato}`} />}
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#0e6493]" /> Contacto
        </h4>
        <div className="space-y-3">
          {client.telefono && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Teléfono principal</p>
                <p className="text-sm font-medium text-gray-900">{formatPhone(client.telefono)}</p>
              </div>
              <a href={`tel:${client.telefono}`} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors">
                <Phone className="w-3.5 h-3.5" /> Llamar
              </a>
            </div>
          )}
          {client.telefono_2 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Teléfono secundario</p>
                <p className="text-sm font-medium text-gray-900">{formatPhone(client.telefono_2)}</p>
              </div>
              <a href={`tel:${client.telefono_2}`} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors">
                <Phone className="w-3.5 h-3.5" /> Llamar
              </a>
            </div>
          )}
          {client.email && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm font-medium text-gray-900">{client.email}</p>
              </div>
              <a href={`mailto:${client.email}`} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100 transition-colors">
                <Mail className="w-3.5 h-3.5" /> Correo
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Ubicación */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#0e6493]" /> Ubicación
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Dirección" value={client.direccion} className="col-span-2" />
          {client.barrio && <InfoRow label="Barrio" value={client.barrio} />}
          {client.sector_nombre && <InfoRow label="Sector" value={`${client.sector_codigo ? client.sector_codigo + ' - ' : ''}${client.sector_nombre}`} />}
          {client.ciudad_nombre && (
            <InfoRow label="Ciudad / Departamento"
              value={`${client.ciudad_nombre}${client.departamento_nombre ? ` · ${client.departamento_nombre}` : ''}`}
              className="col-span-2"
            />
          )}
        </div>
      </div>

      {/* Fechas */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0e6493]" /> Fechas
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Fecha registro" value={formatDate(client.fecha_registro)} />
          {client.fecha_inicio_servicio && <InfoRow label="Inicio servicio" value={formatDate(client.fecha_inicio_servicio)} />}
          {client.fecha_fin_servicio && <InfoRow label="Fin servicio" value={formatDate(client.fecha_fin_servicio)} />}
          <InfoRow label="Creado" value={formatDate(client.created_at)} />
          <InfoRow label="Última actualización" value={formatDate(client.updated_at)} />
        </div>
      </div>

      {/* Observaciones */}
      {client.observaciones && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Observaciones
          </h4>
          <p className="text-sm text-yellow-900 whitespace-pre-wrap">{client.observaciones}</p>
        </div>
      )}
    </div>
  );

  const TabTecnico = () => (
    <div className="space-y-6">
      {/* Conectividad */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#0e6493]" /> Conectividad
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="IP asignada" value={client.ip_asignada} />
          <InfoRow label="Contraseña WiFi" value={client.tap} />
          <InfoRow label="Código usuario" value={client.codigo_usuario} />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Requiere reconexión</p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${client.requiere_reconexion ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {client.requiere_reconexion ? '⚠ Sí' : '✓ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Estado del servicio */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0e6493]" /> Estado del Servicio
        </h4>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${getStateBadge(client.estado)}`}>
            {getStateIcon(client.estado)}
            {client.estado?.charAt(0).toUpperCase() + client.estado?.slice(1)}
          </span>
        </div>
        {clienteCompleto?.servicios && clienteCompleto.servicios.length > 0 && (
          <div className="mt-4 space-y-2">
            {clienteCompleto.servicios.map((srv, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{srv.plan_nombre || srv.nombre_plan || 'Plan sin nombre'}</p>
                  <p className="text-xs text-gray-500">{srv.tipo_plan || 'Internet'} · {srv.velocidad || ''}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateBadge(srv.estado)}`}>
                  {srv.estado}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const TabServicios = () => {
    if (loadingCompleto) return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-[#0e6493] animate-spin mr-2" />
        <span className="text-gray-500">Cargando servicios...</span>
      </div>
    );

    const servicios = clienteCompleto?.servicios || [];

    if (!servicios.length) return (
      <div className="text-center py-12">
        <Wifi className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No hay servicios registrados</p>
      </div>
    );

    return (
      <div className="space-y-4">
        {servicios.map((srv, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0e6493]" />
                <span className="text-sm font-semibold text-gray-800">
                  {srv.plan_nombre || srv.nombre_plan || `Servicio #${i + 1}`}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStateBadge(srv.estado)}`}>
                {srv.estado?.charAt(0).toUpperCase() + srv.estado?.slice(1)}
              </span>
            </div>
            {/* Body */}
            <div className="p-5 grid grid-cols-2 gap-4">
              <InfoRow label="Plan" value={srv.plan_nombre || srv.nombre_plan} />
              <InfoRow label="Precio mensual"
                value={srv.precio_personalizado
                  ? formatCurrency(srv.precio_personalizado)
                  : (srv.plan_precio || srv.precio)
                    ? formatCurrency(srv.plan_precio || srv.precio)
                    : 'Según plan'
                }
              />
              {(srv.plan_tipo || srv.tipo_plan) && <InfoRow label="Tipo" value={srv.plan_tipo || srv.tipo_plan} />}
              {(srv.velocidad_bajada || srv.velocidad) && (
                <InfoRow label="Velocidad"
                  value={srv.velocidad_bajada
                    ? `${srv.velocidad_bajada}/${srv.velocidad_subida || srv.velocidad_bajada} Mbps`
                    : srv.velocidad}
                />)}
              {srv.direccion_servicio && <InfoRow label="Dirección servicio" value={srv.direccion_servicio} className="col-span-2" />}
              {srv.fecha_activacion && <InfoRow label="Activación" value={formatDate(srv.fecha_activacion)} />}
              {srv.fecha_suspension && <InfoRow label="Suspendido" value={formatDate(srv.fecha_suspension)} />}
              {srv.tipo_permanencia && <InfoRow label="Permanencia" value={srv.tipo_permanencia} />}
            </div>
          </div>
        ))}

        {/* ── Conceptos Varios Recurrentes ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 px-5 py-3 flex items-center justify-between border-b border-amber-200">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Conceptos Varios Recurrentes</span>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Se incluyen en cada factura mensual</span>
            </div>
            <button
              onClick={() => { setEditingVarios(null); setVariosForm({ concepto: '', cantidad: 1, valor_unitario: '', aplica_iva: true, porcentaje_iva: 19 }); setShowVariosForm(v => !v); }}
              className="flex items-center gap-1 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Formulario de agregar/editar */}
            {showVariosForm && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  {editingVarios ? 'Editar concepto' : 'Nuevo concepto recurrente'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600 block mb-1">Descripción del concepto</label>
                    <input
                      type="text"
                      value={variosForm.concepto}
                      onChange={e => setVariosForm(f => ({ ...f, concepto: e.target.value }))}
                      placeholder="Ej: Enlace adicional, Soporte preferencial…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Cantidad</label>
                    <input
                      type="number" min="1"
                      value={variosForm.cantidad}
                      onChange={e => setVariosForm(f => ({ ...f, cantidad: parseInt(e.target.value) || 1 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Valor unitario ($)</label>
                    <input
                      type="number" min="0"
                      value={variosForm.valor_unitario}
                      onChange={e => setVariosForm(f => ({ ...f, valor_unitario: e.target.value }))}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={variosForm.aplica_iva}
                        onChange={e => setVariosForm(f => ({ ...f, aplica_iva: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-700">Aplica IVA (19%)</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowVariosForm(false); setEditingVarios(null); }}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarVarios}
                    disabled={!variosForm.concepto || !variosForm.valor_unitario}
                    className="flex items-center gap-1 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3 h-3" /> Guardar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de varios recurrentes */}
            {loadingVarios ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-4 h-4 text-amber-500 animate-spin mr-2" />
                <span className="text-xs text-gray-500">Cargando conceptos...</span>
              </div>
            ) : variosRecurrentes.filter(v => v.activo).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 italic">
                No hay conceptos recurrentes configurados. Los varios de este cliente se generan una sola vez.
              </p>
            ) : (
              variosRecurrentes.filter(v => v.activo).map(v => (
                <div key={v.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.concepto}</p>
                    <p className="text-xs text-gray-500">
                      {v.cantidad > 1 ? `${v.cantidad} × ` : ''}{formatCurrency(v.valor_unitario)}
                      {v.aplica_iva ? ` + ${v.porcentaje_iva}% IVA` : ' (sin IVA)'}
                      {' · '}
                      <span className="text-amber-600 font-medium">Total: {formatCurrency(v.valor_total)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingVarios(v); setVariosForm({ concepto: v.concepto, cantidad: v.cantidad, valor_unitario: v.valor_unitario, aplica_iva: Boolean(v.aplica_iva), porcentaje_iva: v.porcentaje_iva || 19 }); setShowVariosForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEliminarVarios(v)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const TabFacturas = () => {
    if (loadingCompleto) return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-[#0e6493] animate-spin mr-2" />
        <span className="text-gray-500">Cargando facturas...</span>
      </div>
    );

    const facturas = clienteCompleto?.facturas || [];

    if (!facturas.length) return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No hay facturas registradas</p>
      </div>
    );

    return (
      <div className="space-y-3">
        {facturas.map((fac, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">
                  {fac.numero_factura || fac.numero || `#${fac.id}`}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFacturaBadge(fac.estado)}`}>
                  {fac.estado}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {fac.periodo_facturacion || (fac.fecha_desde && fac.fecha_hasta
                  ? `${formatDate(fac.fecha_desde)} → ${formatDate(fac.fecha_hasta)}`
                  : formatDate(fac.fecha_emision || fac.created_at)
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{formatCurrency(fac.total || fac.monto || 0)}</p>
              {fac.fecha_vencimiento && (
                <p className="text-xs text-gray-500">Vence: {formatDate(fac.fecha_vencimiento)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const TabContratos = () => {
    if (loadingCompleto) return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-[#0e6493] animate-spin mr-2" />
        <span className="text-gray-500">Cargando contratos...</span>
      </div>
    );

    const contratos = clienteCompleto?.contratos || [];

    if (!contratos.length) return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No hay contratos registrados</p>
      </div>
    );

    return (
      <div className="space-y-3">
        {contratos.map((con, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0e6493]" />
                <span className="text-sm font-semibold text-gray-800">
                  {con.numero_contrato || con.numero || `Contrato #${con.id}`}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStateBadge(con.estado)}`}>
                {con.estado?.charAt(0).toUpperCase() + con.estado?.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              {con.tipo_contrato && <InfoRow label="Tipo" value={con.tipo_contrato} />}
              {con.fecha_inicio && <InfoRow label="Inicio" value={formatDate(con.fecha_inicio)} />}
              {con.fecha_fin && <InfoRow label="Fin" value={formatDate(con.fecha_fin)} />}
              {con.valor_mensual && <InfoRow label="Valor mensual" value={formatCurrency(con.valor_mensual)} />}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ════════════════════════════ RETURN ════════════════════════════ */

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">

          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-[#0e6493] to-[#1a7ab5] text-white px-6 py-5 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold leading-tight">{client.nombre}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-sm text-white/80">
                    {client.tipo_documento === 'cedula' ? 'CC' :
                     client.tipo_documento === 'nit' ? 'NIT' :
                     client.tipo_documento?.toUpperCase()} {client.identificacion}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStateBadge(client.estado)}`}>
                    {getStateIcon(client.estado)}
                    {client.estado?.charAt(0).toUpperCase() + client.estado?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {permissions.canEdit && (
                  <button onClick={() => setShowServiceManager(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs transition-colors">
                    <Wifi className="w-3.5 h-3.5" /> Servicios
                  </button>
                )}
                {permissions.canEdit && (
                  <button onClick={() => setShowCambiarEstado(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Estado
                  </button>
                )}
                {permissions.canEdit && (
                  <button onClick={onEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs transition-colors">
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
                {permissions.canDelete && (
                  <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/70 hover:bg-red-500 rounded-lg text-xs transition-colors disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                )}
                <button onClick={onClose} className="ml-1 p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 mt-4">
              {client.ciudad_nombre && (
                <div className="flex items-center gap-1.5 text-white/80 text-xs">
                  <MapPin className="w-3.5 h-3.5" /> {client.ciudad_nombre}
                </div>
              )}
              {client.telefono && (
                <div className="flex items-center gap-1.5 text-white/80 text-xs">
                  <Phone className="w-3.5 h-3.5" /> {formatPhone(client.telefono)}
                </div>
              )}
              {client.fecha_registro && (
                <div className="flex items-center gap-1.5 text-white/80 text-xs">
                  <Calendar className="w-3.5 h-3.5" /> Desde {formatDate(client.fecha_registro)}
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs nav ── */}
          <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-1 justify-center
                    ${activeTab === tab.id
                      ? 'border-[#0e6493] text-[#0e6493] bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab content ── */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'personal'  && <TabPersonal />}
            {activeTab === 'tecnico'   && <TabTecnico />}
            {activeTab === 'servicios' && <TabServicios />}
            {activeTab === 'facturas'  && <TabFacturas />}
            {activeTab === 'contratos' && <TabContratos />}
          </div>

          {/* ── Delete confirm overlay ── */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Esta acción no se puede deshacer.</p>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">
                    ¿Eliminar al cliente <strong>{client.nombre}</strong>?
                  </p>
                  <p className="text-xs text-red-600 mt-1">Se eliminará toda la información asociada.</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                    {deleting
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Eliminando...</>
                      : <><Trash2 className="w-4 h-4" />Eliminar Cliente</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showServiceManager && (
        <ClientServiceManager
          cliente={client}
          onClose={() => setShowServiceManager(false)}
          onUpdate={() => setShowServiceManager(false)}
        />
      )}

      {showCambiarEstado && (
        <ModalCambiarEstado
          client={client}
          onConfirm={(datos) => {
            setShowCambiarEstado(false);
            onCambiarEstado?.(datos);
          }}
          onCancel={() => setShowCambiarEstado(false)}
        />
      )}
    </>
  );
};

/* ═══════════════════ Modal Cambiar Estado ═══════════════════ */
const ESTADOS_CONFIG = {
  activo:     { label: 'Activo',     color: 'green',  icon: CheckCircle, desc: 'Servicio normal, se factura' },
  suspendido: { label: 'Suspendido', color: 'yellow', icon: Clock,       desc: 'Servicio limitado, se factura con intereses' },
  cortado:    { label: 'Cortado',    color: 'red',    icon: XCircle,     desc: 'Sin servicio, cobra reconexión al reactivar' },
  retirado:   { label: 'Retirado',   color: 'gray',   icon: X,           desc: 'Contrato terminado, no se factura' },
  inactivo:   { label: 'Inactivo',   color: 'blue',   icon: AlertTriangle, desc: 'Sin servicios activos' },
};

const TRANSICIONES = {
  activo:     ['suspendido', 'cortado', 'retirado', 'inactivo'],
  suspendido: ['activo', 'cortado', 'retirado'],
  cortado:    ['activo', 'suspendido', 'retirado'],
  retirado:   ['activo'],
  inactivo:   ['activo'],
};

const COLOR_CLASSES = {
  green:  'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  red:    'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
  gray:   'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
  blue:   'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
};

const ModalCambiarEstado = ({ client, onConfirm, onCancel }) => {
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const estadoActual = client.estado || 'activo';
  const opcionesDisponibles = TRANSICIONES[estadoActual] || [];
  const configActual = ESTADOS_CONFIG[estadoActual] || {};

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nuevoEstado || !motivo.trim()) return;
    onConfirm({ clienteId: client.id, nuevo_estado: nuevoEstado, motivo, observaciones });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cambiar Estado del Cliente</h2>
          <p className="text-sm text-gray-500 mt-0.5">{client.nombre} - {client.identificacion}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Estado actual */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Estado actual</label>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${COLOR_CLASSES[configActual.color] || ''}`}>
              {configActual.icon && <configActual.icon className="w-4 h-4" />}
              {configActual.label}
            </div>
          </div>

          {/* Nuevo estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cambiar a</label>
            <div className="grid grid-cols-2 gap-2">
              {opcionesDisponibles.map(est => {
                const cfg = ESTADOS_CONFIG[est];
                const Icon = cfg.icon;
                const selected = nuevoEstado === est;
                return (
                  <button type="button" key={est}
                    onClick={() => setNuevoEstado(est)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all
                      ${selected
                        ? `${COLOR_CLASSES[cfg.color]} border-current ring-2 ring-offset-1`
                        : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{cfg.label}</div>
                      <div className="text-xs opacity-70">{cfg.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advertencia reconexión */}
          {estadoActual === 'cortado' && nuevoEstado === 'activo' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Nota:</strong> Al reactivar un cliente cortado se generará un cargo de reconexión automáticamente.
              </p>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required>
              <option value="">Seleccionar motivo...</option>
              <option value="Solicitud del cliente">Solicitud del cliente</option>
              <option value="Mora en pagos">Mora en pagos</option>
              <option value="Pago realizado">Pago realizado / Puesta al día</option>
              <option value="Reconexión autorizada">Reconexión autorizada</option>
              <option value="Retiro voluntario">Retiro voluntario</option>
              <option value="Cambio de domicilio">Cambio de domicilio</option>
              <option value="Decisión administrativa">Decisión administrativa</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
              rows={2} placeholder="Detalles adicionales (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={!nuevoEstado || !motivo.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0a4f75] text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshCw className="w-4 h-4" />
              Cambiar Estado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;
