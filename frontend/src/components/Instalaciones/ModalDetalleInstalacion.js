// frontend/src/components/Instalaciones/ModalDetalleInstalacion.js
import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Package,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  Wrench,
  DollarSign,
  Info,
  AlertCircle,
  XCircle
} from 'lucide-react';

const ModalDetalleInstalacion = ({ isOpen, onClose, instalacion }) => {
  const [equipos, setEquipos] = useState([]);
  const [fotos, setFotos]     = useState({ antes: null, despues: null, firma: null });

  useEffect(() => {
    if (instalacion) {
      cargarDatosCompletos();
    }
    // eslint-disable-next-line
  }, [instalacion]);

  /* ────────────────── helpers ────────────────── */

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const dp = dateString.split('T')[0].split(' ')[0];
      const [y, m, d] = dp.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return null; }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(val) || 0);

  const getEstadoBadge = (estado) => {
    const map = {
      programada: { cls: 'bg-blue-100 text-blue-800 border-blue-200',   icon: <Clock      size={14} />, label: 'Programada' },
      en_proceso: { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Wrench  size={14} />, label: 'En Proceso' },
      completada: { cls: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle size={14} />, label: 'Completada' },
      cancelada:  { cls: 'bg-red-100 text-red-800 border-red-200',       icon: <XCircle   size={14} />, label: 'Cancelada'  },
      reagendada: { cls: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Calendar size={14} />, label: 'Reagendada' },
    };
    return map[estado] || { cls: 'bg-gray-100 text-gray-800 border-gray-200', icon: <AlertCircle size={14} />, label: estado };
  };

  /* ────────────────── data load ────────────────── */

  const cargarDatosCompletos = async () => {
    const token = localStorage.getItem('accessToken');

    // ── Equipos ──
    let equiposIds = [];
    try {
      const raw = instalacion.equipos_instalados || instalacion.equipos;
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        equiposIds = Array.isArray(parsed)
          ? parsed.filter(id => id !== null && id !== undefined && id !== '')
          : [];
      }
    } catch { equiposIds = []; }

    if (equiposIds.length > 0) {
      const list = [];
      for (const equipoId of equiposIds) {
        try {
          const r = await fetch(
            `${process.env.REACT_APP_API_URL}/inventory/equipment/${equipoId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (r.ok) {
            const data = await r.json();
            const eq = data.data || data.equipos || data;
            if (eq) list.push(eq);
          }
        } catch { /* ignore */ }
      }
      setEquipos(list);
    } else {
      setEquipos([]);
    }

    // ── Fotos ──
    try {
      const rawFotos = instalacion.fotos_instalacion || instalacion.fotos;
      if (rawFotos) {
        const fotosData = typeof rawFotos === 'string' ? JSON.parse(rawFotos) : rawFotos;
        if (Array.isArray(fotosData) && fotosData.length > 0) {
          const validas = fotosData.filter(f =>
            (typeof f === 'string' && f.startsWith('data:image')) ||
            (f && typeof f === 'object' && (f.url || f.data))
          );
          const get = (f) => typeof f === 'string' ? f : (f?.url || f?.data);
          setFotos({
            antes:   validas.length >= 1 ? get(validas[0]) : null,
            despues: validas.length >= 3 ? get(validas[1]) : null,
            firma:   validas.length >= 3 ? get(validas[2]) : validas.length === 2 ? get(validas[1]) : null,
          });
          return;
        }
      }
      setFotos({ antes: null, despues: null, firma: null });
    } catch {
      setFotos({ antes: null, despues: null, firma: null });
    }
  };

  if (!isOpen || !instalacion) return null;

  const estadoInfo = getEstadoBadge(instalacion.estado);

  /* ────────────────── sub-components ────────────────── */

  const InfoRow = ({ label, value }) => (
    value ? (
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    ) : null
  );

  /* ────────────────── render ────────────────── */

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#0e6493] to-[#1a7ab5] text-white px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Instalación #{instalacion.id}</p>
              <h2 className="text-xl font-bold">{instalacion.cliente_nombre || 'Sin cliente'}</h2>
              {instalacion.direccion_instalacion && (
                <p className="text-sm text-white/80 mt-1 flex items-center gap-1">
                  <MapPin size={14} /> {instalacion.direccion_instalacion}
                  {instalacion.barrio ? ` · ${instalacion.barrio}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${estadoInfo.cls}`}>
                {estadoInfo.icon} {estadoInfo.label}
              </span>
              <button onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors ml-1">
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Quick info strip */}
          <div className="flex flex-wrap gap-4 mt-3">
            {instalacion.fecha_programada && (
              <div className="flex items-center gap-1.5 text-white/80 text-xs">
                <Calendar size={13} />
                {formatDate(instalacion.fecha_programada) || instalacion.fecha_programada.split('T')[0]}
                {instalacion.hora_programada && ` · ${instalacion.hora_programada}`}
              </div>
            )}
            {instalacion.instalador_nombre_completo && instalacion.instalador_nombre_completo !== 'Instalador no asignado' && (
              <div className="flex items-center gap-1.5 text-white/80 text-xs">
                <Wrench size={13} /> {instalacion.instalador_nombre_completo}
              </div>
            )}
            {instalacion.tipo_instalacion && (
              <div className="flex items-center gap-1.5 text-white/80 text-xs">
                <Info size={13} /> {instalacion.tipo_instalacion}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Row 1: Cliente + Instalador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Cliente */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User size={16} className="text-[#0e6493]" /> Información del Cliente
              </h3>
              <div className="space-y-3">
                <InfoRow label="Nombre" value={instalacion.cliente_nombre} />
                <InfoRow label="Identificación" value={instalacion.cliente_identificacion} />
                {instalacion.cliente_telefono && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Teléfono</p>
                    <a href={`tel:${instalacion.cliente_telefono}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">
                      <Phone size={14} /> {instalacion.cliente_telefono}
                    </a>
                  </div>
                )}
                {instalacion.telefono_contacto && instalacion.telefono_contacto !== instalacion.cliente_telefono && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Teléfono contacto</p>
                    <a href={`tel:${instalacion.telefono_contacto}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">
                      <Phone size={14} /> {instalacion.telefono_contacto}
                    </a>
                  </div>
                )}
                <InfoRow label="Persona que recibe" value={instalacion.persona_recibe} />
              </div>
            </div>

            {/* Instalador */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Wrench size={16} className="text-[#0e6493]" /> Instalador Asignado
              </h3>
              <div className="space-y-3">
                {instalacion.instalador_nombre_completo && instalacion.instalador_nombre_completo !== 'Instalador no asignado'
                  ? (
                    <>
                      <InfoRow label="Nombre" value={instalacion.instalador_nombre_completo} />
                      {instalacion.instalador_telefono && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Teléfono</p>
                          <a href={`tel:${instalacion.instalador_telefono}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">
                            <Phone size={14} /> {instalacion.instalador_telefono}
                          </a>
                        </div>
                      )}
                    </>
                  )
                  : <p className="text-sm text-gray-400 italic">Sin instalador asignado</p>
                }
              </div>
            </div>
          </div>

          {/* Row 2: Programación + Costos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Programación / Timeline */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-[#0e6493]" /> Programación
              </h3>
              <div className="space-y-3">
                <InfoRow label="Fecha programada"
                  value={formatDate(instalacion.fecha_programada) || instalacion.fecha_programada?.split('T')[0]} />
                <InfoRow label="Hora programada" value={instalacion.hora_programada} />
                {instalacion.fecha_realizada && (
                  <InfoRow label="Fecha realizada" value={formatDate(instalacion.fecha_realizada) || instalacion.fecha_realizada?.split('T')[0]} />
                )}
                {instalacion.created_at && (
                  <InfoRow label="Fecha creación" value={formatDate(instalacion.created_at) || instalacion.created_at?.split('T')[0]} />
                )}
                <InfoRow label="Tipo instalación" value={instalacion.tipo_instalacion} />
              </div>
            </div>

            {/* Costo */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-[#0e6493]" /> Costos & Detalles
              </h3>
              <div className="space-y-3">
                {instalacion.costo_instalacion != null && instalacion.costo_instalacion !== '' ? (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Costo instalación</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(instalacion.costo_instalacion)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sin costo registrado</p>
                )}
                {instalacion.motivo_cancelacion && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-semibold uppercase mb-1">Motivo cancelación</p>
                    <p className="text-sm text-red-800">{instalacion.motivo_cancelacion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Equipos instalados */}
          {equipos.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Package size={16} className="text-[#0e6493]" /> Equipos Instalados ({equipos.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {equipos.map((eq, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {eq.nombre || eq.equipo_nombre || eq.descripcion || 'Equipo sin nombre'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Código: {eq.codigo || eq.equipo_codigo || 'N/A'}
                      </p>
                      {(eq.numero_serie || eq.serial) && (
                        <p className="text-xs text-gray-500">S/N: {eq.numero_serie || eq.serial}</p>
                      )}
                      {eq.tipo && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {eq.tipo}
                        </span>
                      )}
                    </div>
                    {eq.estado && (
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                        eq.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                        eq.estado === 'asignado'   ? 'bg-blue-100 text-blue-700'  :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {eq.estado}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos */}
          {(fotos.antes || fotos.despues || fotos.firma) && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <ImageIcon size={16} className="text-[#0e6493]" /> Fotografías
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fotos.antes && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <p className="text-xs font-semibold text-gray-600 px-3 py-2 border-b border-gray-100">
                      Instalación
                    </p>
                    <img src={fotos.antes} alt="Instalación" className="w-full h-48 object-cover" />
                  </div>
                )}
                {fotos.despues && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <p className="text-xs font-semibold text-gray-600 px-3 py-2 border-b border-gray-100">
                      Después
                    </p>
                    <img src={fotos.despues} alt="Después" className="w-full h-48 object-cover" />
                  </div>
                )}
                {fotos.firma && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <p className="text-xs font-semibold text-gray-600 px-3 py-2 border-b border-gray-100">
                      Firma cliente
                    </p>
                    <img src={fotos.firma} alt="Firma" className="w-full h-48 object-contain p-2" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {instalacion.observaciones && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <FileText size={16} /> Observaciones
              </h3>
              <p className="text-sm text-yellow-900 whitespace-pre-wrap">{instalacion.observaciones}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0 flex justify-end">
          <button onClick={onClose}
            className="px-6 py-2.5 bg-[#0e6493] hover:bg-[#0a4d6e] text-white rounded-lg transition-colors font-medium text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleInstalacion;
