// frontend/src/components/Clients/ClientServiceManager.js
// Componente para gestionar servicios de un cliente específico

import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit3, Wifi, Calendar, DollarSign, 
  AlertCircle, Check, Loader2, History, Settings,
  Trash2, Eye
} from 'lucide-react';
import clienteCompletoService from '../../services/clienteCompletoService';

const ClientServiceManager = ({ cliente, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cliente?.id) {
      cargarDatos();
    }
  }, [cliente]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [serviciosResponse, planesResponse] = await Promise.all([
        clienteCompletoService.getClientServices(cliente.id),
        clienteCompletoService.getPlanesDisponibles()
      ]);

      setServicios(serviciosResponse.data || []);
      setPlanesDisponibles(planesResponse.data || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error cargando servicios del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarPlan = (servicio) => {
    setSelectedService(servicio);
    setShowChangeModal(true);
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'activo': 'bg-green-100 text-green-800',
      'suspendido': 'bg-yellow-100 text-yellow-800',
      'cortado': 'bg-red-100 text-red-800',
      'cancelado': 'bg-gray-100 text-gray-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  const servicioActivo = servicios.find(s => s.estado === 'activo');

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Servicios de {cliente.nombre}
              </h2>
              <p className="text-sm text-gray-500">
                Gestión de planes y servicios contratados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          
          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Servicio Activo */}
          {servicioActivo && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Servicio Activo
                </h3>
                <button
                  onClick={() => handleCambiarPlan(servicioActivo)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Cambiar Plan
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{servicioActivo.plan_nombre}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Tipo:</strong> {servicioActivo.plan_tipo}</p>
                      <p><strong>Estado:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getEstadoColor(servicioActivo.estado)}`}>
                          {servicioActivo.estado}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Características</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      {servicioActivo.velocidad_bajada && (
                        <p><strong>Descarga:</strong> {servicioActivo.velocidad_bajada} Mbps</p>
                      )}
                      {servicioActivo.velocidad_subida && (
                        <p><strong>Subida:</strong> {servicioActivo.velocidad_subida} Mbps</p>
                      )}
                      {servicioActivo.canales_tv && (
                        <p><strong>Canales:</strong> {servicioActivo.canales_tv}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Facturación</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Precio:</strong> 
                        {clienteCompletoService.formatearMoneda(
                          servicioActivo.precio_personalizado || servicioActivo.plan_precio
                        )}
                      </p>
                      <p><strong>Activado:</strong> 
                        {clienteCompletoService.formatearFecha(servicioActivo.fecha_activacion)}
                      </p>
                      {servicioActivo.precio_personalizado && (
                        <p className="text-blue-600"><strong>Precio personalizado aplicado</strong></p>
                      )}
                    </div>
                  </div>
                </div>

                {servicioActivo.observaciones && (
                  <div className="mt-4 pt-4 border-t border-green-300">
                    <p className="text-sm text-gray-600">
                      <strong>Observaciones:</strong> {servicioActivo.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historial de Servicios */}
          {servicios.length > 1 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de Servicios
              </h3>

              <div className="space-y-4">
                {servicios
                  .filter(s => s.estado !== 'activo')
                  .map((servicio, index) => (
                    <div key={servicio.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{servicio.plan_nombre}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(servicio.estado)}`}>
                              {servicio.estado}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Período:</strong></p>
                              <p>{clienteCompletoService.formatearFecha(servicio.fecha_activacion)}</p>
                              {servicio.fecha_suspension && (
                                <p>hasta {clienteCompletoService.formatearFecha(servicio.fecha_suspension)}</p>
                              )}
                            </div>
                            
                            <div>
                              <p><strong>Precio:</strong></p>
                              <p>{clienteCompletoService.formatearMoneda(
                                servicio.precio_personalizado || servicio.plan_precio
                              )}</p>
                            </div>
                            
                            <div>
                              <p><strong>Tipo:</strong> {servicio.plan_tipo}</p>
                              {servicio.velocidad_bajada && (
                                <p><strong>Velocidad:</strong> {servicio.velocidad_bajada} Mbps</p>
                              )}
                            </div>
                          </div>

                          {servicio.observaciones && (
                            <p className="mt-2 text-sm text-gray-600">
                              <strong>Observaciones:</strong> {servicio.observaciones}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Estado sin servicios */}
          {servicios.length === 0 && (
            <div className="text-center py-12">
              <Wifi size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay servicios registrados
              </h3>
              <p className="text-gray-600 mb-4">
                Este cliente no tiene servicios asignados actualmente.
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal para cambiar plan */}
      {showChangeModal && selectedService && (
        <ChangePlanModal
          cliente={cliente}
          servicioActual={selectedService}
          planesDisponibles={planesDisponibles}
          onClose={() => {
            setShowChangeModal(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            setShowChangeModal(false);
            setSelectedService(null);
            cargarDatos();
            onUpdate && onUpdate();
          }}
        />
      )}
    </div>
  );
};

// Componente para cambiar plan
const ChangePlanModal = ({ cliente, servicioActual, planesDisponibles, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plan_id: '',
    precio_personalizado: '',
    fecha_activacion: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [previewTotales, setPreviewTotales] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (formData.plan_id) {
      calcularPreview();
    }
  }, [formData.plan_id, formData.precio_personalizado]);

  const calcularPreview = () => {
    const planSeleccionado = planesDisponibles.find(p => p.id == formData.plan_id);
    if (planSeleccionado) {
      const totales = clienteCompletoService.calcularTotalesEnTiempoReal(
        planSeleccionado,
        formData.precio_personalizado,
        cliente.estrato
      );
      setPreviewTotales(totales);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setErrors({});

      await clienteCompletoService.cambiarPlanCliente(cliente.id, formData);
      
      onSuccess();
      
    } catch (error) {
      console.error('Error cambiando plan:', error);
      setErrors({ general: 'Error al cambiar el plan' });
    } finally {
      setLoading(false);
    }
  };

  const planSeleccionado = planesDisponibles.find(p => p.id == formData.plan_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Cambiar Plan de Servicio
            </h3>
            <p className="text-sm text-gray-500">
              Cliente: {cliente.nombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          
          {/* Plan actual */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Plan Actual</h4>
            <p className="text-sm text-gray-600">
              {servicioActual.plan_nombre} - {clienteCompletoService.formatearMoneda(
                servicioActual.precio_personalizado || servicioActual.plan_precio
              )}
            </p>
          </div>

          {/* Error general */}
          {errors.general && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{errors.general}</span>
            </div>
          )}

          {/* Nuevo plan */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Plan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.plan_id}
                onChange={(e) => setFormData(prev => ({ ...prev, plan_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar nuevo plan</option>
                {planesDisponibles
                  .filter(plan => plan.id !== servicioActual.plan_id)
                  .map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} - {clienteCompletoService.formatearMoneda(plan.precio)}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Detalles del plan seleccionado */}
            {planSeleccionado && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{planSeleccionado.nombre}</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Tipo:</strong> {planSeleccionado.tipo}</p>
                  <p><strong>Precio:</strong> {clienteCompletoService.formatearMoneda(planSeleccionado.precio)}</p>
                  {planSeleccionado.velocidad_bajada && (
                    <p><strong>Velocidad:</strong> {planSeleccionado.velocidad_bajada} Mbps</p>
                  )}
                  {planSeleccionado.canales_tv && (
                    <p><strong>Canales:</strong> {planSeleccionado.canales_tv}</p>
                  )}
                </div>
              </div>
            )}

            {/* Precio personalizado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio Personalizado (Opcional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.precio_personalizado}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio_personalizado: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dejar vacío para usar precio del plan"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            {/* Fecha de activación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Cambio
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.fecha_activacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_activacion: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del Cambio
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Motivo del cambio de plan..."
              />
            </div>

            {/* Preview de facturación */}
            {previewTotales && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Nuevo Costo Mensual</h4>
                <div className="text-sm text-green-700 space-y-2">
                  <div className="flex justify-between">
                    <span>Precio del servicio:</span>
                    <span>{clienteCompletoService.formatearMoneda(previewTotales.servicio.precio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA ({previewTotales.servicio.aplica_iva ? '19%' : 'Exento'}):</span>
                    <span>{clienteCompletoService.formatearMoneda(previewTotales.servicio.iva)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-green-300 pt-2">
                    <span>Total mensual:</span>
                    <span>{clienteCompletoService.formatearMoneda(previewTotales.servicio.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading || !formData.plan_id}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cambiando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Cambiar Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientServiceManager;