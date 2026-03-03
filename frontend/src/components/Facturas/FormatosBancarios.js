// frontend/src/components/Facturas/FormatosBancarios.js
// Panel de descarga de formatos de recaudo para envío a bancos/redes de pago

import React, { useState } from 'react';
import { Download, Building2, Wifi, Store, ChevronDown, ChevronUp } from 'lucide-react';
import { facturasService } from '../../services/facturasService';
import { useAuth } from '../../contexts/AuthContext';

// Ciudades / sedes disponibles en el sistema
const SEDES = [
  { id: 'todas', label: 'Todas las sedes' },
  { id: 'campoalegre', label: 'Campoalegre' },
  { id: 'otros', label: 'Otras sedes (San Gil, etc.)' },
];

// Definición de bancos/redes de pago disponibles
const BANCOS = [
  {
    id: 'cajasocial_csv',
    nombre: 'Caja Social Corresponsales',
    descripcion: 'CSV con encabezado (registro tipo 01)',
    icono: Building2,
    color: 'blue',
    sedes: ['todas', 'campoalegre', 'otros'],
    accion: () => facturasService.descargarFormatoCajaSocialCSV(),
    badge: 'CSV',
  },
  {
    id: 'cajasocial_txt',
    nombre: 'Caja Social Corresponsales',
    descripcion: 'TXT sin encabezados (solo registros de detalle)',
    icono: Building2,
    color: 'blue',
    sedes: ['todas', 'campoalegre', 'otros'],
    accion: () => facturasService.descargarFormatoCajaSocialTXT(),
    badge: 'TXT',
  },
  {
    id: 'efecty',
    nombre: 'Efecty',
    descripcion: 'Asobancaria 221 caracteres · Convenio No. 113760',
    icono: Store,
    color: 'yellow',
    sedes: ['todas', 'campoalegre', 'otros'],
    accion: () => facturasService.descargarFormatoEfecty(),
    badge: 'TXT',
  },
  {
    id: 'pse',
    nombre: 'PSE – Pago en Línea',
    descripcion: 'Asobancaria 220 caracteres · www.psi.net.co',
    icono: Wifi,
    color: 'green',
    sedes: ['todas', 'campoalegre', 'otros'],
    accion: () => facturasService.descargarFormatoPSE(),
    badge: 'TXT',
  },
  {
    id: 'finecoop',
    nombre: 'Finecoop',
    descripcion: 'Excel consolidado con ID por cliente',
    icono: Building2,
    color: 'purple',
    sedes: ['todos', 'otros'],   // NO disponible en Campoalegre
    accion: () => facturasService.descargarFormatoFinecoop(),
    badge: 'XLSX',
  },
  {
    id: 'comultrasan',
    nombre: 'Comultrasan',
    descripcion: 'Excel consolidado con ID por cliente',
    icono: Building2,
    color: 'orange',
    sedes: ['todos', 'otros'],   // NO disponible en Campoalegre
    accion: () => facturasService.descargarFormatoComultrasan(),
    badge: 'XLSX',
  },
];

const colorClasses = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700',   badge: 'bg-blue-100 text-blue-800'   },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', btn: 'bg-yellow-500 hover:bg-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  btn: 'bg-green-600 hover:bg-green-700',  badge: 'bg-green-100 text-green-800'  },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', badge: 'bg-purple-100 text-purple-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700', badge: 'bg-orange-100 text-orange-800' },
};

const FormatosBancarios = () => {
  const [sede, setSede] = useState('todas');
  const [cargando, setCargando] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [expandido, setExpandido] = useState(true);
  const { hasPermission } = useAuth();

  if (!hasPermission('administrador') && !hasPermission('supervisor')) return null;

  const bancosVisibles = BANCOS.filter(b => b.sedes.includes(sede));

  const descargar = async (banco) => {
    setCargando(prev => ({ ...prev, [banco.id]: true }));
    setMensaje(null);
    try {
      await banco.accion();
      setMensaje({ tipo: 'success', texto: `Formato ${banco.nombre} (${banco.badge}) descargado correctamente.` });
    } catch (error) {
      console.error(`Error descargando ${banco.id}:`, error);
      setMensaje({ tipo: 'error', texto: `Error al descargar ${banco.nombre}: ${error.message}` });
    } finally {
      setCargando(prev => ({ ...prev, [banco.id]: false }));
      setTimeout(() => setMensaje(null), 6000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 mb-6">
      {/* Header colapsable */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center space-x-3">
          <Download className="w-5 h-5 text-[#0e6493]" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Formatos de Recaudo Bancario</h2>
            <p className="text-sm text-gray-500">
              Descarga los archivos para enviar a cada banco / red de pago
            </p>
          </div>
        </div>
        {expandido ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expandido && (
        <div className="px-6 pb-6">
          {/* Selector de sede */}
          <div className="flex items-center space-x-3 mb-5">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sede / municipio:</label>
            <div className="flex space-x-2">
              {SEDES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSede(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sede === s.id
                      ? 'bg-[#0e6493] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nota sobre Campoalegre */}
          {sede === 'campoalegre' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <strong>Campoalegre</strong> solo tiene disponibles: Caja Social, Efecty y PSE.
              Finecoop y Comultrasan no operan en este municipio.
            </div>
          )}

          {/* Mensaje de resultado */}
          {mensaje && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              mensaje.tipo === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {mensaje.tipo === 'success' ? '✅ ' : '❌ '}{mensaje.texto}
            </div>
          )}

          {/* Nota ID Finecoop / Comultrasan */}
          {(sede === 'todas' || sede === 'otros') && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Finecoop / Comultrasan — campo ID:</strong> Se utiliza el campo{' '}
              <code className="bg-amber-100 px-1 rounded">codigo_usuario</code> del cliente.
              Configure el ID asignado por cada entidad en el perfil de cada cliente.
              Si un cliente tiene varios servicios, se consolida el total de todas sus facturas pendientes en una sola fila.
            </div>
          )}

          {/* Cuadrícula de botones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bancosVisibles.map(banco => {
              const c = colorClasses[banco.color];
              const Icon = banco.icono;
              const loading = cargando[banco.id];
              return (
                <div
                  key={banco.id}
                  className={`flex flex-col justify-between p-4 rounded-xl border ${c.bg} ${c.border}`}
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${c.text}`} />
                        <span className={`font-semibold text-sm ${c.text}`}>{banco.nombre}</span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${c.badge}`}>
                        {banco.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-snug">{banco.descripcion}</p>
                  </div>
                  <button
                    onClick={() => descargar(banco)}
                    disabled={loading}
                    className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${c.btn}`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        <span>Generando…</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormatosBancarios;
