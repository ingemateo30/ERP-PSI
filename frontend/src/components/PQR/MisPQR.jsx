// frontend/src/components/PQR/MisPQR.jsx
// Vista del técnico: sus PQRs asignadas + PQRs sin asignar disponibles

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, CheckCircle, Clock, MessageSquare, User,
  Phone, RefreshCw, ChevronDown, ChevronUp, Send, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API = `${process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1'}/pqr`;

const PRIORIDAD = {
  alta:  { label: 'Alta',  bg: 'bg-red-100',    text: 'text-red-800'    },
  media: { label: 'Media', bg: 'bg-yellow-100',  text: 'text-yellow-800' },
  baja:  { label: 'Baja',  bg: 'bg-gray-100',    text: 'text-gray-700'   },
};

const ESTADO = {
  abierto:    { label: 'Abierto',     bg: 'bg-blue-100',   text: 'text-blue-800',   icon: <AlertCircle size={13} /> },
  en_proceso: { label: 'En proceso',  bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock size={13} /> },
  resuelto:   { label: 'Resuelto',    bg: 'bg-green-100',  text: 'text-green-800',  icon: <CheckCircle size={13} /> },
  cerrado:    { label: 'Cerrado',     bg: 'bg-gray-100',   text: 'text-gray-600',   icon: <X size={13} /> },
};

const Badge = ({ tipo, valor }) => {
  const cfg = tipo === 'prioridad' ? PRIORIDAD[valor] : ESTADO[valor];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon || null} {cfg.label}
    </span>
  );
};

const ModalGestion = ({ pqr, onClose, onSuccess }) => {
  const [estado, setEstado] = useState(pqr.estado === 'abierto' ? 'en_proceso' : pqr.estado);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const res = await fetch(`${API}/${pqr.id}/gestionar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ estado, nota_gestion: nota })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error al gestionar');
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-gray-900">Gestionar PQR #{pqr.id}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Info PQR */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium">{pqr.tipo?.toUpperCase()} — {pqr.descripcion?.slice(0, 80)}...</p>
            {pqr.cliente_nombre && <p className="text-gray-500 mt-1">Cliente: {pqr.cliente_nombre}</p>}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo estado *</label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="en_proceso">En proceso</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota de gestión</label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={3}
              placeholder="Describe las acciones realizadas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={14} />
              {enviando ? 'Guardando...' : 'Guardar gestión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PQRCard = ({ pqr, onGestionar }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge tipo="prioridad" valor={pqr.prioridad} />
            <Badge tipo="estado" valor={pqr.estado} />
            <span className="text-xs text-gray-400">#{pqr.id} · {pqr.tipo}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 line-clamp-2">{pqr.descripcion}</p>
          {pqr.cliente_nombre && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <User size={11} /> {pqr.cliente_nombre}
              {pqr.cliente_telefono && <><Phone size={11} className="ml-2" /> {pqr.cliente_telefono}</>}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {(pqr.fecha_recepcion || pqr.created_at) ? new Date(pqr.fecha_recepcion || pqr.created_at).toLocaleDateString('es-CO') : ''}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {pqr.descripcion && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Descripción completa</p>
              <p className="text-sm text-gray-700">{pqr.descripcion}</p>
            </div>
          )}
          {pqr.respuesta && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Notas de gestión</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{pqr.respuesta}</p>
            </div>
          )}
          {pqr.estado !== 'cerrado' && (
            <button
              onClick={() => onGestionar(pqr)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 w-full justify-center"
            >
              <MessageSquare size={14} />
              Gestionar / Actualizar estado
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const MisPQR = () => {
  const { user } = useAuth();
  const [pqrs, setPqrs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pqrGestion, setPqrGestion] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const params = filtroEstado ? `?estado=${filtroEstado}` : '';
      const res = await fetch(`${API}/mis-pqr${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store' }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error cargando PQRs');
      setPqrs(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const abiertos   = pqrs.filter(p => p.estado === 'abierto').length;
  const enProceso  = pqrs.filter(p => p.estado === 'en_proceso').length;
  const resueltos  = pqrs.filter(p => p.estado === 'resuelto').length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={22} className="text-blue-600" />
            Mis PQR
          </h1>
          <p className="text-sm text-gray-500">PQRs asignadas a ti y casos abiertos disponibles</p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Abiertos', value: abiertos, color: 'blue' },
          { label: 'En proceso', value: enProceso, color: 'yellow' },
          { label: 'Resueltos', value: resueltos, color: 'green' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtro estado */}
      <div className="flex gap-2">
        {['', 'abierto', 'en_proceso', 'resuelto'].map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroEstado === e
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {e === '' ? 'Todos' : ESTADO[e]?.label || e}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={28} className="animate-spin text-blue-500" />
        </div>
      ) : pqrs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No tienes PQRs pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pqrs.map(pqr => (
            <PQRCard key={pqr.id} pqr={pqr} onGestionar={setPqrGestion} />
          ))}
        </div>
      )}

      {pqrGestion && (
        <ModalGestion
          pqr={pqrGestion}
          onClose={() => setPqrGestion(null)}
          onSuccess={cargar}
        />
      )}
    </div>
  );
};

export default MisPQR;
