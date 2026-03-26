// frontend/src/components/Facturas/CruceMasivoBancos.js
// Cruce masivo de pagos bancarios: carga el archivo enviado por el banco,
// previsualiza las facturas encontradas y las marca como pagadas masivamente.

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, Eye, Play, RefreshCw, Building2 } from 'lucide-react';
import { facturasService } from '../../services/facturasService';
import { useAuth } from '../../contexts/AuthContext';

// Configuración de bancos soportados para recepción de archivos de pago
const BANCOS_ENTRADA = [
  {
    id: 'cajasocial',
    nombre: 'Caja Social',
    descripcion: 'Archivo CSV/TXT con registros tipo 02 (formato estándar)',
    color: 'blue',
    extensiones: '.csv,.txt',
    placeholder: 'cajasocial_recaudo.csv'
  },
  {
    id: 'cajasocial_d44',
    nombre: 'Caja Social D44',
    descripcion: 'Archivo .d44 de reporte de recaudo Caja Social',
    color: 'blue',
    extensiones: '.d44,.txt',
    placeholder: 'cajasocial_reporte.d44'
  },
  {
    id: 'finecoop',
    nombre: 'Finecoop',
    descripcion: 'Excel (.xlsx) con códigos de barras de pagos realizados',
    color: 'purple',
    extensiones: '.xlsx,.xls',
    placeholder: 'finecoop_pagos.xlsx'
  },
  {
    id: 'comultrasan',
    nombre: 'Comultrasan',
    descripcion: 'Excel (.xlsx) con códigos de barras de pagos realizados',
    color: 'orange',
    extensiones: '.xlsx,.xls',
    placeholder: 'comultrasan_pagos.xlsx'
  },
  {
    id: 'efecty',
    nombre: 'Efecty',
    descripcion: 'TXT formato fijo Asobancaria 221 caracteres — Convenio Efecty (registros tipo 06)',
    color: 'green',
    extensiones: '.txt',
    placeholder: 'efecty_respuesta.txt'
  },
  {
    id: 'pse',
    nombre: 'PSE',
    descripcion: 'TXT formato fijo Asobancaria 220 caracteres — PSE pago en línea (registros tipo 06)',
    color: 'green',
    extensiones: '.txt',
    placeholder: 'pse_respuesta.txt'
  }
];

const COLOR = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700',   ring: 'ring-blue-500'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', ring: 'ring-purple-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700', ring: 'ring-orange-500' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  btn: 'bg-green-600 hover:bg-green-700',  ring: 'ring-green-500'  }
};

const CruceMasivoBancos = () => {
  const { hasPermission } = useAuth();
  const [bancoSel, setBancoSel] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [fechaPago, setFechaPago] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; });
  const [estado, setEstado] = useState('idle'); // idle | previewing | processing | done | error
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const fileRef = useRef();

  if (!hasPermission('administrador') && !hasPermission('supervisor') && !hasPermission('secretaria')) return null;

  const resetear = () => {
    setArchivo(null);
    setEstado('idle');
    setPreview(null);
    setResultado(null);
    setMensaje(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onArchivoChange = (e) => {
    const f = e.target.files[0];
    setArchivo(f || null);
    setPreview(null);
    setResultado(null);
    setMensaje(null);
  };

  const handlePreview = async () => {
    if (!archivo || !bancoSel) return;
    setEstado('previewing');
    setMensaje(null);
    try {
      const data = await facturasService.previewCruceMasivo(archivo, bancoSel.id);
      setPreview(data);
      setEstado('idle');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
      setEstado('error');
    }
  };

  const handleProcesar = async () => {
    if (!archivo || !bancoSel) return;
    if (!window.confirm(
      `¿Confirma marcar como PAGADAS ${preview?.encontradas ?? '?'} facturas con método de pago "${bancoSel.nombre}"?\n\nEsta acción no se puede deshacer.`
    )) return;

    setEstado('processing');
    setMensaje(null);
    try {
      const data = await facturasService.procesarCruceMasivo(archivo, bancoSel.id, fechaPago);
      setResultado(data);
      setEstado('done');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
      setEstado('error');
    }
  };

  const fmtMoneda = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-1">
          <Building2 className="w-6 h-6 text-[#0e6493]" />
          <h2 className="text-xl font-bold text-gray-900">Cruce Masivo de Pagos Bancarios</h2>
        </div>
        <p className="text-sm text-gray-500 ml-9">
          Cargue el archivo enviado por el banco, previsualice las facturas detectadas y márquelas como pagadas.
        </p>
      </div>

      {/* Paso 1: Seleccionar banco */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">1 · Seleccione el banco / entidad</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BANCOS_ENTRADA.map(b => {
            const c = COLOR[b.color];
            const activo = bancoSel?.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => { setBancoSel(b); resetear(); }}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  activo
                    ? `${c.bg} ${c.border} ring-2 ${c.ring} ring-offset-1`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <p className={`font-semibold text-sm ${activo ? c.text : 'text-gray-800'}`}>{b.nombre}</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{b.descripcion}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Paso 2: Cargar archivo + fecha */}
      {bancoSel && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">2 · Cargue el archivo de <span className="text-[#0e6493]">{bancoSel.nombre}</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo ({bancoSel.extensiones})
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#0e6493] transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {archivo ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{archivo.name}</p>
                    <p className="text-xs text-gray-500">{(archivo.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Haga clic para seleccionar o arrastre el archivo aquí
                  </p>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={bancoSel.extensiones}
                className="hidden"
                onChange={onArchivoChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de pago a registrar
              </label>
              <input
                type="date"
                value={fechaPago}
                onChange={e => setFechaPago(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si el archivo incluye fecha de pago por registro, ésta tiene prioridad.
              </p>
            </div>
          </div>

          {archivo && (
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handlePreview}
                disabled={estado === 'previewing'}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-60 text-sm font-medium transition-colors"
              >
                {estado === 'previewing'
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Analizando…</span></>
                  : <><Eye className="w-4 h-4" /><span>Previsualizar</span></>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mensaje de error */}
      {mensaje && (
        <div className={`rounded-lg p-4 text-sm flex items-start space-x-2 ${
          mensaje.tipo === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {mensaje.tipo === 'error' ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Paso 3: Preview */}
      {preview && estado !== 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">3 · Resultado del análisis</h3>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{preview.total}</p>
              <p className="text-xs text-gray-500 mt-1">Registros en archivo</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{preview.encontradas}</p>
              <p className="text-xs text-gray-500 mt-1">Facturas encontradas</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{preview.no_encontradas}</p>
              <p className="text-xs text-gray-500 mt-1">No encontradas</p>
            </div>
          </div>

          {/* Tabla: facturas que SÍ se marcarán */}
          {preview.detalle_encontradas?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                Facturas que se marcarán como PAGADAS ({preview.detalle_encontradas.length})
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Identificación</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto archivo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {preview.detalle_encontradas.slice(0, 50).map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-800">{p.identificacion}</td>
                        <td className="px-4 py-2 text-gray-700">{p.factura?.nombre_cliente || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{p.factura?.numero_factura || '—'}</td>
                        <td className="px-4 py-2 text-gray-900 font-semibold">{fmtMoneda(p.monto)}</td>
                      </tr>
                    ))}
                    {preview.detalle_encontradas.length > 50 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-2 text-center text-xs text-gray-500">
                          … y {preview.detalle_encontradas.length - 50} más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No encontradas */}
          {preview.detalle_no_encontradas?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 text-amber-500 mr-1" />
                Registros sin factura pendiente ({preview.detalle_no_encontradas.length})
              </h4>
              <div className="overflow-x-auto rounded-lg border border-amber-200 bg-amber-50 max-h-40 overflow-y-auto">
                <table className="min-w-full text-xs divide-y divide-amber-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-1 text-left text-amber-700 font-medium">Identificación</th>
                      <th className="px-3 py-1 text-left text-amber-700 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.detalle_no_encontradas.map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1 font-mono text-amber-800">{p.identificacion}</td>
                        <td className="px-3 py-1 text-amber-800">{fmtMoneda(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botón procesar */}
          {preview.encontradas > 0 && (
            <div className="mt-6 flex items-center space-x-4">
              <button
                onClick={handleProcesar}
                disabled={estado === 'processing'}
                className="flex items-center space-x-2 px-6 py-2.5 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 disabled:opacity-60 text-sm font-semibold transition-colors"
              >
                {estado === 'processing'
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Procesando…</span></>
                  : <><Play className="w-4 h-4" /><span>Confirmar y marcar {preview.encontradas} facturas como pagadas</span></>
                }
              </button>
              <button onClick={resetear} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resultado final */}
      {estado === 'done' && resultado && (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <CheckCircle className="w-7 h-7 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">Cruce completado</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{resultado.total_procesados}</p>
              <p className="text-xs text-gray-500 mt-1">Registros leídos</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{resultado.marcadas}</p>
              <p className="text-xs text-gray-500 mt-1">Marcadas pagadas</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{resultado.no_encontradas}</p>
              <p className="text-xs text-gray-500 mt-1">No encontradas</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{resultado.errores}</p>
              <p className="text-xs text-gray-500 mt-1">Con error</p>
            </div>
          </div>

          {resultado.detalle_marcadas?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Facturas marcadas como pagadas</h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha pago</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {resultado.detalle_marcadas.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{m.numero_factura}</td>
                        <td className="px-4 py-2 text-gray-700">{m.nombre_cliente}</td>
                        <td className="px-4 py-2 font-semibold text-green-700">{fmtMoneda(m.monto)}</td>
                        <td className="px-4 py-2 text-gray-600">{m.fecha_pago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            onClick={() => { setBancoSel(null); resetear(); }}
            className="mt-4 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 text-sm font-medium transition-colors"
          >
            Realizar otro cruce
          </button>
        </div>
      )}
    </div>
  );
};

export default CruceMasivoBancos;
