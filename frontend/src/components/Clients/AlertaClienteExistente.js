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

  const { cliente, servicios, facturas_pendientes, alertas } = verificacion;
  const serviciosActivos = servicios.filter(s => s.estado === 'activo');

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
    <div className="space-y-4">
      {/* Alerta principal */}
      <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">
                ⚠️ Cliente ya registrado
              </h3>
              <p className="text-sm text-orange-700">
                La identificación {cliente.identificacion} ya existe en el sistema
              </p>
            </div>
          </div>
          <button
            onClick={() => setMostrarDetalles(!mostrarDetalles)}
            className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1"
          >
            {mostrarDetalles ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {mostrarDetalles ? 'Ocultar' : 'Ver'} detalles
          </button>
        </div>

        {/* Información básica siempre visible */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-600" />
              <span className="font-medium">{cliente.nombre}</span>
            </div>
            {cliente.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-600" />
                <span>{cliente.telefono}</span>
              </div>
            )}
            {cliente.correo && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-600" />
                <span>{cliente.correo}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-600 mt-0.5" />
              <span>{cliente.direccion}</span>
            </div>
            <div className="text-sm">
              Estado: <span className={`font-medium ${cliente.estado === 'activo' ? 'text-green-600' : 'text-red-600'}`}>
                {cliente.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Servicios activos</div>
                <div className="text-lg font-semibold text-blue-600">
                  {serviciosActivos.length}
                </div>
              </div>
            </div>
          </div>
          
          {facturas_pendientes && (
            <>
              <div className="bg-white p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="text-sm text-gray-600">Facturas pendientes</div>
                    <div className="text-lg font-semibold text-yellow-600">
                      {facturas_pendientes.total_pendientes || 0}
                    </div>
                  </div>
                </div>
              </div>
              
              {facturas_pendientes.valor_pendiente > 0 && (
                <div className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-sm text-gray-600">Valor pendiente</div>
                      <div className="text-lg font-semibold text-red-600">
                        ${facturas_pendientes.valor_pendiente.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Botones de acción */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => onContinuarConCliente && onContinuarConCliente(cliente)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar servicios a este cliente
          </button>
          
          <button
            onClick={() => onVerHistorial && onVerHistorial(cliente)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Ver historial completo
          </button>

          {onCrearNuevo && (
            <button
              onClick={onCrearNuevo}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ignorar y crear nuevo
            </button>
          )}
        </div>
      </div>

      {/* Alertas específicas */}
      {alertas && alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.slice(1).map((alerta, index) => (
            <div key={index} className={`p-3 border rounded-lg ${getColorAlerta(alerta.tipo)}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getIconoAlerta(alerta.icono || alerta.tipo)}
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium text-sm">{alerta.titulo}</h4>
                  <p className="text-xs mt-1">{alerta.mensaje}</p>
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Información detallada</h4>
          
          {/* Servicios */}
          {servicios && servicios.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-gray-900 mb-2">Servicios ({servicios.length})</h5>
              <div className="space-y-2">
                {servicios.map((servicio, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <span className="font-medium">{servicio.plan_nombre}</span>
                      <span className="text-gray-600 ml-2">({servicio.tipo_servicio})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>${(servicio.precio_personalizado || servicio.precio_plan).toLocaleString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Datos personales</h5>
              <div className="space-y-1 text-gray-600">
                <div><span className="font-medium">Tipo documento:</span> {cliente.tipo_documento}</div>
                <div><span className="font-medium">Estrato:</span> {cliente.estrato}</div>
                <div><span className="font-medium">Barrio:</span> {cliente.barrio}</div>
                {cliente.ciudad_nombre && (
                  <div><span className="font-medium">Ciudad:</span> {cliente.ciudad_nombre}</div>
                )}
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 mb-2">Información del sistema</h5>
              <div className="space-y-1 text-gray-600">
                <div><span className="font-medium">Fecha registro:</span> {new Date(cliente.fecha_registro).toLocaleDateString()}</div>
                <div><span className="font-medium">Estado:</span> {cliente.estado}</div>
                {cliente.observaciones && (
                  <div><span className="font-medium">Observaciones:</span> {cliente.observaciones}</div>
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