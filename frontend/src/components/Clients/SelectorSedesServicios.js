// frontend/src/components/Clients/SelectorSedesServicios.js
// Componente para seleccionar servicios agrupados POR SEDE

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Wifi, Tv, Building, User, MapPin, 
  DollarSign, FileText, AlertCircle, Package
} from 'lucide-react';

const SelectorSedesServicios = ({ 
  sedesSeleccionadas = [], 
  onSedesChange, 
  planesDisponibles = [] 
}) => {
  const [sedes, setSedes] = useState(sedesSeleccionadas);

  useEffect(() => {
    setSedes(sedesSeleccionadas);
  }, [sedesSeleccionadas]);

  // Separar planes por tipo (ya no hay combos)
  const planesInternet = planesDisponibles.filter(p => p.tipo === 'internet');
  const planesTelevision = planesDisponibles.filter(p => p.tipo === 'television');

  const agregarNuevaSede = () => {
    const nuevaSede = {
      id: Date.now(),
      
      // Información de la sede
      nombre_sede: '',
      direccion_servicio: '',
      contacto_sede: '',
      telefono_sede: '',
      
      // SERVICIOS EN ESTA SEDE (Internet Y/O TV)
      planInternetId: '',        // Plan de internet para esta sede
      planTelevisionId: '',      // Plan de TV para esta sede
      
      // Precios personalizados
      precioPersonalizado: false,
      precioInternetCustom: '',
      precioTelevisionCustom: '',
      
      // Configuración del contrato (aplica a toda la sede)
      tipoContrato: 'sin_permanencia',
      mesesPermanencia: 0,
      fechaActivacion: new Date().toISOString().split('T')[0],
      
      // Observaciones
      observaciones: ''
    };
    
    const nuevasSedes = [...sedes, nuevaSede];
    setSedes(nuevasSedes);
    onSedesChange(nuevasSedes);
  };

  const actualizarSede = (index, campo, valor) => {
    const nuevasSedes = [...sedes];
    nuevasSedes[index][campo] = valor;
    
    // Auto-rellenar nombre de sede si está vacío
    if (campo === 'direccion_servicio' && !nuevasSedes[index].nombre_sede) {
      nuevasSedes[index].nombre_sede = `Sede ${index + 1}`;
    }
    
    setSedes(nuevasSedes);
    onSedesChange(nuevasSedes);
  };

  const eliminarSede = (index) => {
    const nuevasSedes = sedes.filter((_, i) => i !== index);
    setSedes(nuevasSedes);
    onSedesChange(nuevasSedes);
  };

  const calcularTotalSede = (sede) => {
    let total = 0;
    
    // Internet en esta sede
    if (sede.planInternetId) {
      const planInternet = planesInternet.find(p => p.id == sede.planInternetId);
      const precioInternet = sede.precioPersonalizado && sede.precioInternetCustom ? 
        parseFloat(sede.precioInternetCustom) : 
        parseFloat(planInternet?.precio || 0);
      total += precioInternet;
    }
    
    // TV en esta sede
    if (sede.planTelevisionId) {
      const planTv = planesTelevision.find(p => p.id == sede.planTelevisionId);
      const precioTv = sede.precioPersonalizado && sede.precioTelevisionCustom ? 
        parseFloat(sede.precioTelevisionCustom) : 
        parseFloat(planTv?.precio || 0);
      total += precioTv;
    }
    
    return total;
  };

  const calcularTotalGeneral = () => {
    return sedes.reduce((total, sede) => total + calcularTotalSede(sede), 0);
  };

  const contarServiciosPorSede = (sede) => {
    let count = 0;
    if (sede.planInternetId) count++;
    if (sede.planTelevisionId) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Sedes y Servicios
          </h3>
          <p className="text-sm text-gray-600">
            Cada sede tendrá un contrato unificado y una factura unificada
          </p>
        </div>
        <button
          type="button"
          onClick={agregarNuevaSede}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Sede
        </button>
      </div>

      {/* Resumen */}
      {sedes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">
                Resumen: {sedes.length} sede(s) • {sedes.reduce((sum, sede) => sum + contarServiciosPorSede(sede), 0)} servicio(s) total
              </span>
            </div>
            <span className="text-lg font-bold text-blue-900">
              ${calcularTotalGeneral().toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Lista de sedes */}
      {sedes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay sedes configuradas</p>
          <p className="text-sm text-gray-500 mb-4">
            Cada sede puede tener Internet y/o Televisión con un solo contrato
          </p>
          <button
            type="button"
            onClick={agregarNuevaSede}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Agregar la primera sede
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sedes.map((sede, index) => (
            <div key={sede.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
              {/* Header de la sede */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Building className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {sede.nombre_sede || `Sede ${index + 1}`}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {contarServiciosPorSede(sede)} servicio(s) • 1 contrato • 1 factura
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold text-green-600">
                      ${calcularTotalSede(sede).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => eliminarSede(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Información de la sede */}
                  <div className="space-y-4">
                    <h5 className="font-medium text-gray-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Información de la Sede
                    </h5>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de la Sede
                      </label>
                      <input
                        type="text"
                        value={sede.nombre_sede}
                        onChange={(e) => actualizarSede(index, 'nombre_sede', e.target.value)}
                        placeholder={`Sede ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dirección de la Sede *
                      </label>
                      <input
                        type="text"
                        value={sede.direccion_servicio}
                        onChange={(e) => actualizarSede(index, 'direccion_servicio', e.target.value)}
                        placeholder="Dirección donde se prestarán los servicios"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Esta dirección aparecerá en el contrato y la factura
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contacto en Sede
                        </label>
                        <input
                          type="text"
                          value={sede.contacto_sede}
                          onChange={(e) => actualizarSede(index, 'contacto_sede', e.target.value)}
                          placeholder="Nombre del responsable"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono de Sede
                        </label>
                        <input
                          type="text"
                          value={sede.telefono_sede}
                          onChange={(e) => actualizarSede(index, 'telefono_sede', e.target.value)}
                          placeholder="Teléfono de contacto"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Configuración del contrato */}
                    <div className="pt-4 border-t border-gray-200">
                      <h6 className="font-medium text-gray-900 mb-3">Configuración del Contrato</h6>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Contrato
                          </label>
                          <select
                            value={sede.tipoContrato}
                            onChange={(e) => actualizarSede(index, 'tipoContrato', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="sin_permanencia">Sin Permanencia</option>
                            <option value="con_permanencia">Con Permanencia</option>
                          </select>
                        </div>

                        {sede.tipoContrato === 'con_permanencia' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Meses de Permanencia
                            </label>
                            <select
                              value={sede.mesesPermanencia}
                              onChange={(e) => actualizarSede(index, 'mesesPermanencia', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="6">6 meses</option>
                              <option value="12">12 meses</option>
                              <option value="18">18 meses</option>
                              <option value="24">24 meses</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Servicios en esta sede */}
                  <div className="space-y-4">
                    <h5 className="font-medium text-gray-900 flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      Servicios en esta Sede
                    </h5>

                    {/* Internet */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Wifi className="w-5 h-5 text-blue-600 mr-2" />
                        <h6 className="font-medium text-gray-900">Internet</h6>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plan de Internet
                        </label>
                        <select
                          value={sede.planInternetId}
                          onChange={(e) => actualizarSede(index, 'planInternetId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Sin internet</option>
                          {planesInternet.map(plan => (
                            <option key={plan.id} value={plan.id}>
                              {plan.nombre} - ${plan.precio?.toLocaleString()}
                              {plan.velocidad_bajada && ` (${plan.velocidad_bajada} Mbps)`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {sede.planInternetId && sede.precioPersonalizado && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio Personalizado Internet
                          </label>
                          <input
                            type="number"
                            value={sede.precioInternetCustom}
                            onChange={(e) => actualizarSede(index, 'precioInternetCustom', e.target.value)}
                            placeholder="Precio personalizado"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Televisión */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Tv className="w-5 h-5 text-purple-600 mr-2" />
                        <h6 className="font-medium text-gray-900">Televisión</h6>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plan de Televisión
                        </label>
                        <select
                          value={sede.planTelevisionId}
                          onChange={(e) => actualizarSede(index, 'planTelevisionId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Sin televisión</option>
                          {planesTelevision.map(plan => (
                            <option key={plan.id} value={plan.id}>
                              {plan.nombre} - ${plan.precio?.toLocaleString()}
                              {plan.canales_tv && ` (${plan.canales_tv} canales)`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {sede.planTelevisionId && sede.precioPersonalizado && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio Personalizado TV
                          </label>
                          <input
                            type="number"
                            value={sede.precioTelevisionCustom}
                            onChange={(e) => actualizarSede(index, 'precioTelevisionCustom', e.target.value)}
                            placeholder="Precio personalizado"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Precio personalizado toggle */}
                    {(sede.planInternetId || sede.planTelevisionId) && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`precio-personalizado-${index}`}
                          checked={sede.precioPersonalizado}
                          onChange={(e) => actualizarSede(index, 'precioPersonalizado', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor={`precio-personalizado-${index}`} className="text-sm text-gray-700">
                          Usar precios personalizados
                        </label>
                      </div>
                    )}

                    {/* Validación */}
                    {!sede.planInternetId && !sede.planTelevisionId && (
                      <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-700">
                          Debe seleccionar al menos Internet o Televisión
                        </span>
                      </div>
                    )}

                    {/* Resumen de la sede */}
                    {(sede.planInternetId || sede.planTelevisionId) && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h6 className="font-medium text-green-900 mb-2">Resumen de la Sede</h6>
                        <div className="space-y-1 text-sm">
                          {sede.planInternetId && (
                            <div className="flex justify-between">
                              <span>Internet:</span>
                              <span className="font-medium">
                                ${(sede.precioPersonalizado && sede.precioInternetCustom ? 
                                  parseFloat(sede.precioInternetCustom) : 
                                  parseFloat(planesInternet.find(p => p.id == sede.planInternetId)?.precio || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {sede.planTelevisionId && (
                            <div className="flex justify-between">
                              <span>Televisión:</span>
                              <span className="font-medium">
                                ${(sede.precioPersonalizado && sede.precioTelevisionCustom ? 
                                  parseFloat(sede.precioTelevisionCustom) : 
                                  parseFloat(planesTelevision.find(p => p.id == sede.planTelevisionId)?.precio || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <hr className="border-green-300" />
                          <div className="flex justify-between font-semibold text-green-900">
                            <span>Total Sede:</span>
                            <span>${calcularTotalSede(sede).toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-green-700">
                            • 1 contrato unificado • 1 factura mensual
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Observaciones */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <textarea
                        value={sede.observaciones}
                        onChange={(e) => actualizarSede(index, 'observaciones', e.target.value)}
                        rows={3}
                        placeholder="Observaciones adicionales para esta sede..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen final */}
      {sedes.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Resumen Final</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sedes.length}</div>
              <div className="text-sm text-gray-600">Sede(s)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{sedes.length}</div>
              <div className="text-sm text-gray-600">Contrato(s)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${calcularTotalGeneral().toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Mensual</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-300">
            <div className="space-y-2">
              {sedes.map((sede, index) => (
                <div key={sede.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {sede.nombre_sede || `Sede ${index + 1}`} 
                    ({contarServiciosPorSede(sede)} servicio{contarServiciosPorSede(sede) !== 1 ? 's' : ''})
                  </span>
                  <span className="font-medium">${calcularTotalSede(sede).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectorSedesServicios;