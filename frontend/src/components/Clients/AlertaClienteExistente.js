// frontend/src/components/Clients/AlertaClienteExistente.js
// Crear este archivo nuevo

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Info, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Eye, 
  Wifi,
  CreditCard,
  FileText,
  CheckCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const AlertaClienteExistente = ({ 
  verificacion, 
  onContinuarConCliente, 
  onCrearNuevo,
  onVerHistorial 
}) => {
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  if (!verificacion) return null;

  if (!verificacion.existe) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">Cliente nuevo</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          Esta identificación no está registrada. Puede proceder con el registro.
        </p>
      </div>
    );
  }

  // ✅ ACTUALIZADO: Nueva estructura con múltiples ubicaciones
  const {
    cliente,
    ubicaciones = [],
    servicios_totales = [],
    facturas_pendientes_totales,
    alertas = []
  } = verificacion;

  const serviciosActivos = servicios_totales.filter(s => s.estado === 'activo');

  const getIconoAlerta = (tipo) => {
    const iconos = {
      info: Info,
      warning: AlertTriangle,
      error: AlertTriangle,
      wifi: Wifi,
      'credit-card': CreditCard,
      'file-text': FileText
    };
    
    const IconComponent = iconos[tipo] || Info;
    return <IconComponent className="h-4 w-4" />;
  };

  const getColorAlerta = (tipo) => {
    const colores = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    };
    
    return colores[tipo] || colores.info;
  };

  return (
    <div className="space-y-4 w-full">
      {/* Alerta principal */}
<div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 p-2 bg-orange-100 rounded-full">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-orange-900 text-base mb-1">
              ⚠️ Cliente ya registrado
            </h3>
            <p className="text-sm text-orange-700 break-words">
              La identificación <span className="font-mono font-medium">{cliente.identificacion}</span> ya existe en el sistema
            </p>
          </div>
          <button
            onClick={() => setMostrarDetalles(!mostrarDetalles)}
            className="flex-shrink-0 px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1"
          >
            {mostrarDetalles ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {mostrarDetalles ? 'Ocultar' : 'Ver'} detalles
          </button>
        </div>

        {/* Información básica siempre visible */}
        <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <span className="font-medium truncate">{cliente.nombre}</span>
              </div>
              {cliente.telefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="truncate">{cliente.telefono}</span>
                </div>
              )}
              {cliente.correo && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="truncate">{cliente.correo}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                <span className="break-words">{cliente.direccion}</span>
              </div>
              <div className="text-sm">
                Estado: <span className={`font-medium ${cliente.estado === 'activo' ? 'text-green-600' : 'text-red-600'}`}>
                  {cliente.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wifi className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600">Servicios activos</div>
                <div className="text-lg font-bold text-blue-600">
                  {serviciosActivos.length}
                </div>
              </div>
            </div>
          </div>

          {facturas_pendientes_totales && (
            <>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <CreditCard className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-600">Facturas pendientes</div>
                    <div className="text-lg font-bold text-yellow-600">
                      {facturas_pendientes_totales.total_pendientes || 0}
                    </div>
                  </div>
                </div>
              </div>

              {facturas_pendientes_totales.valor_pendiente > 0 && (
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 truncate">Valor pendiente</div>
                      <div className="text-lg font-bold text-red-600 truncate">
                        ${facturas_pendientes_totales.valor_pendiente.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onContinuarConCliente && onContinuarConCliente(cliente)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Agregar servicios a este cliente
            </button>

            <button
              onClick={() => onVerHistorial && onVerHistorial(cliente)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Eye className="h-4 w-4" />
              Ver historial completo
            </button>
          </div>

          {onCrearNuevo && (
            <button
              onClick={onCrearNuevo}
              className="w-full px-4 py-2.5 text-sm text-orange-700 hover:text-orange-800 hover:bg-white rounded-lg transition-all border-2 border-orange-300 hover:border-orange-400 font-medium"
            >
              Ignorar y crear nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* Alertas específicas */}
      {alertas && alertas.length > 0 && (
        <div className="space-y-3">
          {alertas.slice(1, 4).map((alerta, index) => (
            <div key={index} className={`p-4 border-2 rounded-lg shadow-sm ${getColorAlerta(alerta.tipo)}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-white bg-opacity-50 rounded-lg">
                  {getIconoAlerta(alerta.icono || alerta.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">{alerta.titulo}</h4>
                  <p className="text-xs break-words leading-relaxed">{alerta.mensaje}</p>
                  {alerta.accion && (
                    <p className="text-xs mt-2 font-medium opacity-75">{alerta.accion}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detalles expandidos */}
      {mostrarDetalles && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-5 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-4 text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Información detallada
          </h4>

          {/* Servicios */}
          {servicios_totales && servicios_totales.length > 0 && (
            <div className="mb-5">
              <h5 className="font-semibold text-gray-900 mb-3">Servicios ({servicios_totales.length})</h5>
              <div className="space-y-2">
                {servicios_totales.map((servicio, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold block truncate">{servicio.plan_nombre}</span>
                      <span className="text-gray-600 text-xs">({servicio.tipo_servicio})</span>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-shrink-0">
                      <span className="font-medium">${(servicio.precio_personalizado || servicio.precio_plan).toLocaleString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        servicio.estado === 'activo'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {servicio.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datos adicionales en dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Datos personales
              </h5>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo documento:</span>
                  <span className="font-medium">{cliente.tipo_documento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estrato:</span>
                  <span className="font-medium">{cliente.estrato}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Barrio:</span>
                  <span className="font-medium truncate ml-2" title={cliente.barrio}>{cliente.barrio}</span>
                </div>
                {cliente.ciudad_nombre && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ciudad:</span>
                    <span className="font-medium">{cliente.ciudad_nombre}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Información del sistema
              </h5>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha registro:</span>
                  <span className="font-medium">{new Date(cliente.fecha_registro).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium">{cliente.estado}</span>
                </div>
                {cliente.observaciones && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-600 block mb-1">Observaciones:</span>
                    <span className="font-medium text-xs break-words">{cliente.observaciones}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertaClienteExistente;