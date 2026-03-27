// frontend/src/components/Clients/ClientServiceManager.js
// Componente para gestionar servicios de un cliente específico

import React, { useState, useEffect } from 'react';
import {
  X, Plus, Edit3, Wifi, Calendar, DollarSign,
  AlertCircle, Check, Loader2, History, Settings,
  Trash2, Eye, ArrowRightLeft, Clock, XCircle
} from 'lucide-react';
import clienteCompletoService from '../../services/clienteCompletoService';

const ClientServiceManager = ({ cliente, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [showMigrarModal, setShowMigrarModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // servicioId being processed

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

  const handleMigrarPlan = (servicio) => {
    setSelectedService(servicio);
    setShowMigrarModal(true);
  };

  const handleProgramarBaja = (servicio) => {
    setSelectedService(servicio);
    setShowBajaModal(true);
  };

  const handleCancelarBajaProgamada = async (servicio) => {
    if (!window.confirm(`¿Cancelar la baja programada del servicio "${servicio.plan_nombre}"?`)) return;
    setActionLoading(servicio.id);
    try {
      const token = localStorage.getItem('accessToken');
      const r = await fetch(`/api/v1/clientes/${cliente.id}/servicios/${servicio.id}/cancelar-programacion-baja`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.success) {
        await cargarDatos();
        onUpdate && onUpdate();
      } else {
        alert(d.message || 'Error al cancelar baja programada');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setActionLoading(null);
    }
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

  const serviciosActivos = servicios.filter(s => s.estado === 'activo');
  const serviciosInactivos = servicios.filter(s => s.estado !== 'activo');

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

          {/* Servicios Activos */}
          {serviciosActivos.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Servicios Activos ({serviciosActivos.length})
                </h3>
                <button
                  onClick={() => setShowAgregarModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Servicio
                </button>
              </div>

              <div className="space-y-4">
                {serviciosActivos.map(servicio => (
                  <div key={servicio.id} className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 text-lg">{servicio.plan_nombre}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(servicio.estado)}`}>
                          {servicio.estado}
                        </span>
                        {servicio.plan_tipo && (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 capitalize">
                            {servicio.plan_tipo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleMigrarPlan(servicio)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          title="Cambio de plan inmediato con prorrateo"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          Migrar Plan
                        </button>
                        {servicio.fecha_programada_cancelacion ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1.5 rounded-lg">
                              <Clock className="w-3 h-3" />
                              Baja {new Date(servicio.fecha_programada_cancelacion + 'T12:00:00').toLocaleDateString('es-CO')}
                            </span>
                            <button
                              onClick={() => handleCancelarBajaProgamada(servicio)}
                              disabled={actionLoading === servicio.id}
                              className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs border border-gray-300"
                              title="Cancelar baja programada"
                            >
                              {actionLoading === servicio.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <XCircle className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleProgramarBaja(servicio)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm"
                            title="Programar cancelación al final del ciclo actual"
                          >
                            <Clock className="w-3 h-3" />
                            Programar Baja
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2 text-sm">Características</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          {servicio.velocidad_bajada && (
                            <p><strong>Descarga:</strong> {servicio.velocidad_bajada} Mbps</p>
                          )}
                          {servicio.velocidad_subida && (
                            <p><strong>Subida:</strong> {servicio.velocidad_subida} Mbps</p>
                          )}
                          {servicio.canales_tv && (
                            <p><strong>Canales TV:</strong> {servicio.canales_tv}</p>
                          )}
                          {!servicio.velocidad_bajada && !servicio.canales_tv && (
                            <p className="text-gray-400 italic">Sin detalles adicionales</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-700 mb-2 text-sm">Facturación</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Precio:</strong>{' '}
                            {clienteCompletoService.formatearMoneda(
                              servicio.precio_personalizado || servicio.plan_precio
                            )}
                          </p>
                          <p><strong>Activado:</strong>{' '}
                            {clienteCompletoService.formatearFecha(servicio.fecha_activacion)}
                          </p>
                          {servicio.precio_personalizado && (
                            <p className="text-blue-600 text-xs font-medium">Precio personalizado</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-700 mb-2 text-sm">Información</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>ID Servicio:</strong> #{servicio.id}</p>
                          <p><strong>Plan ID:</strong> #{servicio.plan_id}</p>
                          {servicio.fecha_programada_cancelacion && (
                            <p className="text-red-700 font-medium">
                              <strong>Baja programada:</strong>{' '}
                              {clienteCompletoService.formatearFecha(servicio.fecha_programada_cancelacion)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial de Servicios (solo inactivos) */}
          {serviciosInactivos.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de Servicios ({serviciosInactivos.length})
              </h3>

              <div className="space-y-4">
                {serviciosInactivos.map(servicio => (
                  <div key={servicio.id} className="border border-gray-200 rounded-lg p-4">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado sin servicios */}
          {servicios.length === 0 && serviciosActivos.length === 0 && (
            <div className="text-center py-12">
              <Wifi size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay servicios registrados
              </h3>
              <p className="text-gray-600 mb-4">
                Este cliente no tiene servicios asignados actualmente.
              </p>
              <button
                onClick={() => setShowAgregarModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Servicio
              </button>
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

      {/* Modal para agregar servicio */}
      {showAgregarModal && (
        <AgregarServicioModal
          cliente={cliente}
          planesDisponibles={planesDisponibles}
          onClose={() => setShowAgregarModal(false)}
          onSuccess={() => {
            setShowAgregarModal(false);
            cargarDatos();
            onUpdate && onUpdate();
          }}
        />
      )}

      {/* Modal: Migrar plan (inmediato + prorrateo) */}
      {showMigrarModal && selectedService && (
        <MigrarPlanModal
          cliente={cliente}
          servicio={selectedService}
          planesDisponibles={planesDisponibles}
          onClose={() => { setShowMigrarModal(false); setSelectedService(null); }}
          onSuccess={() => {
            setShowMigrarModal(false);
            setSelectedService(null);
            cargarDatos();
            onUpdate && onUpdate();
          }}
        />
      )}

      {/* Modal: Programar baja al fin del ciclo */}
      {showBajaModal && selectedService && (
        <ProgramarBajaModal
          cliente={cliente}
          servicio={selectedService}
          onClose={() => { setShowBajaModal(false); setSelectedService(null); }}
          onSuccess={() => {
            setShowBajaModal(false);
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

      await clienteCompletoService.cambiarPlanCliente(cliente.id, {
        ...formData,
        servicio_id: servicioActual.id
      });
      
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

// Componente para agregar un nuevo servicio al cliente
const AgregarServicioModal = ({ cliente, planesDisponibles, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plan_id: '',
    tipo_servicio: 'internet',
    precio_personalizado: '',
    fecha_activacion: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [errors, setErrors] = useState({});

  const planSeleccionado = planesDisponibles.find(p => p.id == formData.plan_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.plan_id) {
      setErrors({ general: 'Selecciona un plan de servicio' });
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      await clienteCompletoService.agregarServicioCliente(cliente.id, {
        plan_id: parseInt(formData.plan_id),
        precio_personalizado: formData.precio_personalizado ? parseFloat(formData.precio_personalizado) : null,
        fecha_activacion: formData.fecha_activacion,
        observaciones: formData.observaciones
      });

      onSuccess();
    } catch (error) {
      console.error('Error agregando servicio:', error);
      setErrors({ general: error.message || 'Error al agregar el servicio' });
    } finally {
      setLoading(false);
    }
  };

  const planesFiltrados = planesDisponibles.filter(p =>
    !formData.tipo_servicio || p.tipo === formData.tipo_servicio || p.tipo === 'combo'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Agregar Servicio</h3>
            <p className="text-sm text-gray-500">Cliente: {cliente.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm">{errors.general}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Servicio
            </label>
            <select
              value={formData.tipo_servicio}
              onChange={(e) => setFormData(prev => ({ ...prev, tipo_servicio: e.target.value, plan_id: '' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="internet">Internet</option>
              <option value="television">Televisión</option>
              <option value="combo">Combo (Internet + TV)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.plan_id}
              onChange={(e) => setFormData(prev => ({ ...prev, plan_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Seleccionar plan</option>
              {planesFiltrados.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre} — {clienteCompletoService.formatearMoneda(plan.precio)}
                </option>
              ))}
            </select>
          </div>

          {planSeleccionado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-medium mb-1">{planSeleccionado.nombre}</p>
              {planSeleccionado.velocidad_bajada && (
                <p>Velocidad: {planSeleccionado.velocidad_bajada} Mbps bajada / {planSeleccionado.velocidad_subida} Mbps subida</p>
              )}
              {planSeleccionado.canales_tv && (
                <p>Canales TV: {planSeleccionado.canales_tv}</p>
              )}
              <p>Precio: {clienteCompletoService.formatearMoneda(planSeleccionado.precio)}/mes</p>
            </div>
          )}

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
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Dejar vacío para usar precio del plan"
                min="0"
                step="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Activación
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.fecha_activacion}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_activacion: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Motivo de la adición del servicio..."
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Agregar Servicio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Migrar Plan (inmediato con prorrateo)
// ═══════════════════════════════════════════════════════════════════════════
const MigrarPlanModal = ({ cliente, servicio, planesDisponibles, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planId, setPlanId] = useState('');
  const [resultado, setResultado] = useState(null);

  const planSeleccionado = planesDisponibles.find(p => p.id == planId);
  const precioActual = servicio.precio_personalizado || servicio.plan_precio || 0;
  const precioNuevo = planSeleccionado?.precio || 0;
  const diferencia = precioNuevo - precioActual;

  const handlePreview = () => {
    if (!planId) return;
    const hoy = new Date();
    const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const diasRestantes = diasEnMes - hoy.getDate() + 1;
    const prorrateo = diferencia > 0 ? Math.round((diferencia / diasEnMes) * diasRestantes) : 0;
    setResultado({ diasRestantes, prorrateo, diasEnMes });
  };

  useEffect(() => { if (planId) handlePreview(); else setResultado(null); }, [planId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planId) { setError('Seleccione el nuevo plan'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const r = await fetch(`/api/v1/clientes/${cliente.id}/servicios/${servicio.id}/migrar-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nuevo_plan_id: planId })
      });
      const d = await r.json();
      if (d.success) {
        onSuccess();
      } else {
        setError(d.message || 'Error al migrar plan');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Migrar Plan (Inmediato)
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              El cambio aplica hoy con prorrateo del mes actual
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Plan actual */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-gray-500 text-xs mb-1">Plan actual</p>
            <p className="font-medium text-gray-900">{servicio.plan_nombre}</p>
            <p className="text-gray-600">{clienteCompletoService.formatearMoneda(precioActual)} / mes</p>
          </div>

          {/* Nuevo plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuevo plan <span className="text-red-500">*</span>
            </label>
            <select
              value={planId}
              onChange={e => setPlanId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            >
              <option value="">Seleccionar plan</option>
              {planesDisponibles
                .filter(p => p.id !== servicio.plan_id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — {clienteCompletoService.formatearMoneda(p.precio)}/mes
                  </option>
                ))}
            </select>
          </div>

          {/* Preview prorrateo */}
          {resultado && planSeleccionado && (
            <div className={`p-4 rounded-lg border text-sm ${diferencia > 0 ? 'bg-amber-50 border-amber-200' : diferencia < 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="font-medium text-gray-800 mb-2">Resumen del cambio</p>
              <div className="space-y-1 text-gray-700">
                <p>Días restantes del mes: <strong>{resultado.diasRestantes}</strong></p>
                <p>Diferencia de precio: <strong>{clienteCompletoService.formatearMoneda(diferencia)}</strong></p>
                {resultado.prorrateo > 0 && (
                  <p className="text-amber-800 font-medium">
                    Cargo por prorrateo en próxima factura: {clienteCompletoService.formatearMoneda(resultado.prorrateo)}
                  </p>
                )}
                {diferencia <= 0 && (
                  <p className="text-green-700">Sin cargo adicional (plan igual o menor precio)</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !planId}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Migración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Programar Baja (al final del ciclo de facturación)
// ═══════════════════════════════════════════════════════════════════════════
const ProgramarBajaModal = ({ cliente, servicio, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [motivo, setMotivo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const r = await fetch(`/api/v1/clientes/${cliente.id}/servicios/${servicio.id}/programar-baja`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ motivo_cancelacion: motivo })
      });
      const d = await r.json();
      if (d.success) {
        onSuccess();
      } else {
        setError(d.message || 'Error al programar baja');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-600" />
              Programar Baja de Servicio
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              El servicio se cancelará al final del ciclo de facturación actual
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-1">
            <p className="font-medium">Servicio a cancelar: {servicio.plan_nombre}</p>
            <p>Precio: {clienteCompletoService.formatearMoneda(servicio.precio_personalizado || servicio.plan_precio)}/mes</p>
            <p className="mt-2 text-red-700">
              El servicio seguirá activo hasta que venza la última factura pagada. La baja no aplica de forma inmediata.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de cancelación
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: Solicitud del cliente, se muda, cambio de proveedor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Programar Baja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientServiceManager;