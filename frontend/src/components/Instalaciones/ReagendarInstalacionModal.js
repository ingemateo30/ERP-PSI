// frontend/src/components/Instalaciones/ReagendarInstalacionModal.js - MODAL PROFESIONAL PARA REAGENDAR

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  AlertTriangle,
  RotateCcw,
  Save,
  MessageSquare,
  Info
} from 'lucide-react';

const ReagendarInstalacionModal = ({ 
  visible, 
  instalacion, 
  onReagendar, 
  onCerrar, 
  procesando = false 
}) => {
  // ==========================================
  // ESTADOS
  // ==========================================
  
  const [formData, setFormData] = useState({
    nueva_fecha: '',
    nueva_hora: '09:00',
    motivo: '',
    observaciones_adicionales: ''
  });

  const [errores, setErrores] = useState({});
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // ==========================================
  // EFECTOS
  // ==========================================

  useEffect(() => {
    if (visible && instalacion) {
      // Resetear formulario cuando se abre el modal
      setFormData({
        nueva_fecha: '',
        nueva_hora: '09:00',
        motivo: '',
        observaciones_adicionales: ''
      });
      setErrores({});
      setMostrarConfirmacion(false);
    }
  }, [visible, instalacion]);

  // ==========================================
  // FUNCIONES DE MANEJO
  // ==========================================

  const handleChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));

    // Limpiar error del campo
    if (errores[campo]) {
      setErrores(prev => ({
        ...prev,
        [campo]: null
      }));
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validar fecha
    if (!formData.nueva_fecha) {
      nuevosErrores.nueva_fecha = 'La nueva fecha es obligatoria';
    } else {
      const fechaNueva = new Date(formData.nueva_fecha);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaNueva < hoy) {
        nuevosErrores.nueva_fecha = 'La fecha no puede ser anterior a hoy';
      }

      // Verificar que no sea la misma fecha actual
      const fechaActual = new Date(instalacion?.fecha_programada);
      fechaActual.setHours(0, 0, 0, 0);
      
      if (fechaNueva.getTime() === fechaActual.getTime() && 
          formData.nueva_hora === instalacion?.hora_programada) {
        nuevosErrores.nueva_fecha = 'Debe seleccionar una fecha u hora diferente';
      }
    }

    // Validar motivo
    if (!formData.motivo.trim()) {
      nuevosErrores.motivo = 'El motivo del reagendamiento es obligatorio';
    } else if (formData.motivo.trim().length < 10) {
      nuevosErrores.motivo = 'El motivo debe tener al menos 10 caracteres';
    }

    return nuevosErrores;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const erroresValidacion = validarFormulario();
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion);
      return;
    }

    setMostrarConfirmacion(true);
  };

  const confirmarReagendamiento = () => {
    const datosReagendamiento = {
      fecha_programada: formData.nueva_fecha,
      hora_programada: formData.nueva_hora,
      motivo: formData.motivo,
      observaciones: formData.observaciones_adicionales
    };

    onReagendar(instalacion.id, datosReagendamiento);
    setMostrarConfirmacion(false);
  };

  const handleCerrar = () => {
    if (!procesando) {
      setMostrarConfirmacion(false);
      onCerrar();
    }
  };

  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const datePart = (typeof fecha === 'string' ? fecha : fecha.toISOString()).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearHora = (hora) => {
    if (!hora) return '-';
    return hora.substring(0, 5);
  };

  const obtenerDiferenciaDias = () => {
    if (!formData.nueva_fecha || !instalacion?.fecha_programada) return 0;
    
    const fechaActual = new Date(instalacion.fecha_programada);
    const fechaNueva = new Date(formData.nueva_fecha);
    
    const diferencia = Math.ceil((fechaNueva - fechaActual) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  // ==========================================
  // MOTIVOS PREDEFINIDOS
  // ==========================================

  const motivosPredefinidos = [
    'Cliente no disponible en la fecha programada',
    'Condiciones climáticas adversas',
    'Falta de materiales o equipos',
    'Instalador no disponible',
    'Problemas de acceso a la ubicación',
    'Solicitud del cliente',
    'Reorganización de agenda',
    'Emergencia técnica',
    'Otro motivo'
  ];

  // ==========================================
  // RENDER
  // ==========================================

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-lg bg-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <RotateCcw className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Reagendar Instalación
              </h3>
              <p className="text-sm text-gray-600">
                Programa una nueva fecha para la instalación
              </p>
            </div>
          </div>
          
          <button
            onClick={handleCerrar}
            disabled={procesando}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!mostrarConfirmacion ? (
          // Formulario principal
          <form onSubmit={handleSubmit} className="p-6">
            
            {/* Información actual */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Información Actual
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Cliente:</span>
                  <p className="text-blue-900">{instalacion?.cliente_nombre || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Fecha actual:</span>
                  <p className="text-blue-900">{formatearFecha(instalacion?.fecha_programada)}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Hora actual:</span>
                  <p className="text-blue-900">{formatearHora(instalacion?.hora_programada)}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Dirección:</span>
                  <p className="text-blue-900">{instalacion?.direccion_instalacion || 'No especificada'}</p>
                </div>
              </div>
            </div>

            {/* Nueva programación */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Nueva fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Nueva fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.nueva_fecha}
                    onChange={(e) => handleChange('nueva_fecha', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      errores.nueva_fecha ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errores.nueva_fecha && (
                    <p className="mt-1 text-sm text-red-600">{errores.nueva_fecha}</p>
                  )}
                  
                  {/* Mostrar diferencia de días */}
                  {formData.nueva_fecha && (
                    <div className="mt-2 text-sm text-gray-600">
                      {(() => {
                        const diferencia = obtenerDiferenciaDias();
                        if (diferencia > 0) {
                          return (
                            <span className="text-green-600">
                              📅 {diferencia} día{diferencia !== 1 ? 's' : ''} después de la fecha original
                            </span>
                          );
                        } else if (diferencia < 0) {
                          return (
                            <span className="text-red-600">
                              📅 {Math.abs(diferencia)} día{Math.abs(diferencia) !== 1 ? 's' : ''} antes de la fecha original
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-blue-600">
                              📅 Misma fecha, solo cambio de hora
                            </span>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>

                {/* Nueva hora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Nueva hora *
                  </label>
                  <input
                    type="time"
                    value={formData.nueva_hora}
                    onChange={(e) => handleChange('nueva_hora', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Motivo del reagendamiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Motivo del reagendamiento *
                </label>
                
                {/* Motivos predefinidos */}
                <div className="mb-3">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && e.target.value !== 'Otro motivo') {
                        handleChange('motivo', e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Seleccionar motivo predefinido...</option>
                    {motivosPredefinidos.map((motivo, index) => (
                      <option key={index} value={motivo}>
                        {motivo}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={formData.motivo}
                  onChange={(e) => handleChange('motivo', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errores.motivo ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe el motivo del reagendamiento..."
                />
                {errores.motivo && (
                  <p className="mt-1 text-sm text-red-600">{errores.motivo}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Mínimo 10 caracteres ({formData.motivo.length}/10)
                </p>
              </div>

              {/* Observaciones adicionales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Observaciones adicionales
                </label>
                <textarea
                  value={formData.observaciones_adicionales}
                  onChange={(e) => handleChange('observaciones_adicionales', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Información adicional (opcional)..."
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end space-x-3 mt-8">
              <button
                type="button"
                onClick={handleCerrar}
                disabled={procesando}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={procesando}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reagendar Instalación
              </button>
            </div>
          </form>
        ) : (
          // Pantalla de confirmación
          <div className="p-6">
            
            {/* Advertencia */}
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-700">
                    <strong>¿Confirmas el reagendamiento?</strong>
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    Esta acción cambiará la fecha y hora de la instalación. Se notificará al cliente y al instalador.
                  </p>
                </div>
              </div>
            </div>

            {/* Resumen de cambios */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Resumen de cambios:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="mb-2">
                    <span className="text-gray-600">Fecha anterior:</span>
                    <p className="font-medium text-red-600">{formatearFecha(instalacion?.fecha_programada)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Nueva fecha:</span>
                    <p className="font-medium text-green-600">{formatearFecha(formData.nueva_fecha)}</p>
                  </div>
                </div>
                
                <div>
                  <div className="mb-2">
                    <span className="text-gray-600">Hora anterior:</span>
                    <p className="font-medium text-red-600">{formatearHora(instalacion?.hora_programada)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Nueva hora:</span>
                    <p className="font-medium text-green-600">{formatearHora(formData.nueva_hora)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="text-gray-600">Motivo:</span>
                <p className="font-medium text-gray-900 mt-1">{formData.motivo}</p>
                
                {formData.observaciones_adicionales && (
                  <div className="mt-2">
                    <span className="text-gray-600">Observaciones:</span>
                    <p className="text-gray-700 mt-1">{formData.observaciones_adicionales}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de confirmación */}
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setMostrarConfirmacion(false)}
                disabled={procesando}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Volver a editar
              </button>
              
              <button
                onClick={confirmarReagendamiento}
                disabled={procesando}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {procesando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Reagendando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Confirmar Reagendamiento
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReagendarInstalacionModal;