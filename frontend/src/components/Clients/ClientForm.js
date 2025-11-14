// frontend/src/components/Clients/ClientForm.js
// Formulario completo corregido con selector de permanencia

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Save, Loader2, User, MapPin, Phone, Mail,
  CreditCard, Building, Wifi, Tv, AlertCircle, Check,
  Calendar, DollarSign, Settings, Clock, FileText
} from 'lucide-react';
import { clientService } from '../../services/clientService';
import configService, { ConfigService } from '../../services/configService';
import clienteCompletoService from '../../services/clienteCompletoService';
import AlertasClienteService from '../../services/alertasClienteService';
import AlertaClienteExistente from './AlertaClienteExistente';

const ClientForm = ({ client, onClose, onSave, permissions }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [verificandoCliente, setVerificandoCliente] = useState(false);
  const [verificacionCliente, setVerificacionCliente] = useState(null);
  const [modoAgregarServicio, setModoAgregarServicio] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Filtrar planes por tipo
  const planesInternet = planesDisponibles.filter(p => p.tipo === 'internet');
  const planesTelevision = planesDisponibles.filter(p => p.tipo === 'television');

  // ✅ Estado del formulario CORREGIDO
  const [formData, setFormData] = useState({
    // Datos básicos del cliente
    identificacion: '',
    tipo_documento: 'cedula',
    nombre: '',
    email: '',
    telefono: '',
    telefono_fijo: '',
    direccion: '',
    barrio: '',
    estrato: '3',
    ciudad_id: '',
    sector_id: '',
    observaciones: '',

    // Datos del servicio a asignar
    plan_id: '',
    precio_personalizado: '',
    fecha_activacion: new Date().toISOString().split('T')[0],
    observaciones_servicio: '',
    planInternetId: '',
    planTelevisionId: '',
    precioInternetCustom: '',
    precioTelevisionCustom: '',
    usarServiciosSeparados: false,

    // ✅ CORRECCIÓN PROBLEMA 3: Campos de permanencia
    tipo_permanencia: 'sin_permanencia', // REQUERIDO
    meses_permanencia: 6, // REQUERIDO
    mostrar_detalle_costos: true, // MOSTRAR CALCULADORA

    // Configuración adicional
    generar_documentos: true,
    enviar_bienvenida: true,
    programar_instalacion: true
  });

  // ✅ FUNCIÓN PARA CALCULAR COSTO EN TIEMPO REAL - CORREGIDA
  const calcularCostoInstalacion = useCallback(() => {
    let serviciosCount = 0;

    if (formData.usarServiciosSeparados) {
      if (formData.planInternetId) serviciosCount++;
      if (formData.planTelevisionId) serviciosCount++;
    } else if (formData.plan_id) {
      serviciosCount = 1;
    }

    if (serviciosCount === 0) return { costo: 0, servicios: 0 };

    // ✅ CORRECCIÓN: UNA SOLA INSTALACIÓN independientemente de la cantidad de servicios
    const costoInstalacion = formData.tipo_permanencia === 'sin_permanencia' ? 150000 : 50000;

    return {
      costo: costoInstalacion, // ✅ Siempre el mismo costo
      servicios: serviciosCount,
      costo_por_instalacion: costoInstalacion, // ✅ Cambio de nombre
      incluye_iva: formData.tipo_permanencia === 'sin_permanencia',
      es_instalacion_unica: true // ✅ Flag para mostrar en UI
    };
  }, [formData.tipo_permanencia, formData.planInternetId, formData.planTelevisionId, formData.plan_id, formData.usarServiciosSeparados]);

  // ✅ COMPONENTE SELECTOR DE PERMANENCIA CORREGIDO
  const SelectorPermanenciaCompleto = () => {
    const calculoCostos = calcularCostoInstalacion();

    return (
      <div className="border-t-2 border-[#0e6493]/10 pt-6">
        <h4 className="text-md font-semibold text-[#0e6493] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Tipo de Permanencia
        </h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Seleccione el tipo de permanencia <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3">
              {/* Opción SIN permanencia */}
              <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.tipo_permanencia === 'sin_permanencia'
                ? 'border-[#0e6493] bg-[#0e6493]/5 shadow-md'
                : 'border-gray-300 hover:border-[#0e6493]/50 hover:bg-gray-50'
                }`}>
                <input
                  type="radio"
                  name="tipo_permanencia"
                  value="sin_permanencia"
                  checked={formData.tipo_permanencia === 'sin_permanencia'}
                  onChange={(e) => handleInputChange('tipo_permanencia', e.target.value)}
                  className="mt-1 mr-3 text-[#0e6493]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#0e6493]">Sin Permanencia</div>
                    <div className="text-lg font-bold text-[#0e6493]">$150,000</div>
                  </div>
                  <div className="text-sm text-[#0e6493]/80 mb-1">Una sola instalación - IVA incluido</div>
                  <div className="text-xs text-gray-600">
                    ✓ Sin compromisos de tiempo<br />
                    ✓ Puede cancelar cuando desee<br />
                    ✓ Una instalación para todos los servicios
                  </div>
                </div>
              </label>

              {/* Opción CON permanencia */}
              <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.tipo_permanencia === 'con_permanencia'
                ? 'border-green-600 bg-green-50 shadow-md'
                : 'border-gray-300 hover:border-green-500 hover:bg-gray-50'
                }`}>
                <input
                  type="radio"
                  name="tipo_permanencia"
                  value="con_permanencia"
                  checked={formData.tipo_permanencia === 'con_permanencia'}
                  onChange={(e) => handleInputChange('tipo_permanencia', e.target.value)}
                  className="mt-1 mr-3 text-green-600"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-green-700">Con Permanencia (6 meses)</div>
                    <div className="text-lg font-bold text-green-700">$50,000</div>
                  </div>
                  <div className="text-sm text-green-600 mb-1">Una sola instalación - Ahorra $100,000</div>
                  <div className="text-xs text-gray-600">
                    ✓ Compromiso mínimo de 6 meses<br />
                    ✓ Precio de instalación reducido<br />
                    ✓ Una instalación para todos los servicios
                  </div>
                </div>
              </label>
            </div>
            {errors.tipo_permanencia && (
              <p className="mt-2 text-sm text-red-600">{errors.tipo_permanencia}</p>
            )}
          </div>

          {/* Calculadora de costo CORREGIDA */}
          {calculoCostos.servicios > 0 && (
            <div className="bg-gradient-to-br from-[#0e6493]/5 to-green-50/50 p-4 rounded-lg border-2 border-[#0e6493]/20">
              <h5 className="font-semibold text-[#0e6493] mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Resumen de Costos de Instalación
              </h5>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicios a instalar:</span>
                  <span className="font-medium">{calculoCostos.servicios}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de instalación:</span>
                  <span className="font-medium text-green-600">✓ Instalación única</span>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800">COSTO TOTAL INSTALACIÓN:</span>
                    <span className="text-xl font-bold text-green-600">
                      ${calculoCostos.costo.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  ✓ {calculoCostos.incluye_iva && 'IVA incluido'}<br />
                  ✓ Una sola visita de instalación<br />
                  {formData.tipo_permanencia === 'con_permanencia' && '✓ Permanencia mínima de 6 meses'}
                </div>
              </div>

              {/* Info adicional */}
              <div className="mt-3 p-2 bg-[#0e6493]/10 rounded border border-[#0e6493]/30">
                <div className="text-xs text-[#0e6493] font-medium">
                  💡 {calculoCostos.servicios > 1
                    ? `Internet y TV se instalan en la misma visita por $${calculoCostos.costo.toLocaleString()}`
                    : `Una instalación de $${calculoCostos.costo.toLocaleString()}`
                  }
                </div>
              </div>

              {/* Comparación de ahorro */}
              {formData.tipo_permanencia === 'con_permanencia' && (
                <div className="mt-2 p-2 bg-green-100 rounded border border-green-400">
                  <div className="text-xs text-green-700 font-medium">
                    💰 Ahorro total: $100,000 vs sin permanencia
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  useEffect(() => {
    const verificarClienteExistente = async () => {
      if (formData.identificacion.length >= 6 && !client) { // Solo para clientes nuevos
        setVerificandoCliente(true);

        const response = await AlertasClienteService.verificarClienteExistente(
          formData.identificacion,
          formData.tipo_documento
        );

        // Verificar si existe un cliente y establecerlo
        if (response.success && response.data) {
          setVerificacionCliente(response.data);
        } else {
          setVerificacionCliente(null);
        }

        setVerificandoCliente(false);
      } else {
        setVerificacionCliente(null);
      }
    };

    // Debounce para evitar muchas consultas
    const timeout = setTimeout(verificarClienteExistente, 800);
    return () => clearTimeout(timeout);
  }, [formData.identificacion, formData.tipo_documento, client]);

  // 4. AGREGAR estas funciones después de las funciones existentes:
  const manejarContinuarConClienteExistente = (cliente) => {
    setModoAgregarServicio(true);
    setClienteSeleccionado(cliente);

    // ✅ CORRECCIÓN: Pre-llenar campos del cliente existente y limpiar servicios completamente
    setFormData(prev => ({
      ...prev,
      identificacion: cliente.identificacion,
      tipo_documento: cliente.tipo_documento,
      nombre: cliente.nombre,
      email: cliente.correo || cliente.email || '',
      telefono: cliente.telefono || '',
      telefono_fijo: cliente.telefono_2 || '',
      direccion: cliente.direccion || '',
      barrio: cliente.barrio || '',
      estrato: cliente.estrato || '3',
      ciudad_id: cliente.ciudad_id || '',
      sector_id: cliente.sector_id || '',
      observaciones: cliente.observaciones || '',

      // ✅ Limpiar TODOS los datos de servicio para el nuevo servicio
      plan_id: '',
      precio_personalizado: '',
      planInternetId: '',
      planTelevisionId: '',
      precioInternetCustom: '',
      precioTelevisionCustom: '',
      usarServiciosSeparados: false,
      observaciones_servicio: '',

      // Restablecer tipo de permanencia a valor predeterminado
      tipo_permanencia: 'sin_permanencia',
      meses_permanencia: 6,

      // En modo agregar servicio, no generar documentos completos
      generar_documentos: false,
      enviar_bienvenida: false,
      programar_instalacion: true
    }));

    // Limpiar errores previos
    setErrors({});
  };

  const manejarVerHistorial = (cliente) => {
    // Aquí podrías abrir un modal con el historial o navegar a otra página
    console.log('Ver historial de cliente:', cliente);
    alert(`Ver historial de ${cliente.nombre} - Funcionalidad por implementar`);
  };

  const manejarCrearNuevo = () => {
    setVerificacionCliente(null);
    setModoAgregarServicio(false);
    setClienteSeleccionado(null);
  };

  const agregarServicioAClienteExistente = async () => {
    try {
      // ✅ CORRECCIÓN: Preparar datos del nuevo servicio con todos los campos necesarios
      const nuevoServicio = {
        // Servicios separados o plan único
        planInternetId: formData.usarServiciosSeparados ? formData.planInternetId : null,
        planTelevisionId: formData.usarServiciosSeparados ? formData.planTelevisionId : null,
        plan_id: !formData.usarServiciosSeparados ? formData.plan_id : null,

        // Precios personalizados
        precioInternetCustom: formData.precioInternetCustom || null,
        precioTelevisionCustom: formData.precioTelevisionCustom || null,
        precio_personalizado: formData.precio_personalizado || null,

        // Datos de activación y permanencia
        fecha_activacion: formData.fecha_activacion,
        tipo_permanencia: formData.tipo_permanencia,
        meses_permanencia: formData.tipo_permanencia === 'con_permanencia' ? (formData.meses_permanencia || 6) : 0,

        // Observaciones
        observaciones: formData.observaciones_servicio || '',

        // Opciones de generación
        programar_instalacion: formData.programar_instalacion !== false
      };

      console.log('📤 Enviando datos de nuevo servicio:', nuevoServicio);

      const response = await AlertasClienteService.agregarServicioAClienteExistente(
        clienteSeleccionado.id,
        nuevoServicio
      );

      if (response.success) {
        const mensaje = `Servicio agregado exitosamente al cliente ${clienteSeleccionado.nombre}`;
        if (window.showNotification) {
          window.showNotification('success', mensaje);
        } else {
          alert(mensaje);
        }
        onSave({ tipo: 'servicio_agregado', cliente: clienteSeleccionado, servicio: response.data });
      } else {
        throw new Error(response.message || 'Error agregando servicio');
      }
    } catch (error) {
      console.error('❌ Error agregando servicio:', error);

      const mensajeError = error.response?.data?.message || error.message || 'Error agregando servicio al cliente';

      if (window.showNotification) {
        window.showNotification('error', mensajeError);
      } else {
        alert(mensajeError);
      }

      throw error;
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
    if (client) {
      cargarDatosCliente();
    }
  }, [client]);

  const recalcularPreciosEnTiempoReal = () => {
    if (!planSeleccionado || !formData.estrato) return;

    const estratoNum = parseInt(formData.estrato) || 4;
    const precioBase = parseFloat(formData.precio_personalizado) || planSeleccionado.precio;

    let precioFinal = precioBase;
    let aplicaIva = false;
    let valorIva = 0;

    // Determinar si aplica IVA según tipo y estrato
    if (planSeleccionado.tipo === 'internet') {
      aplicaIva = estratoNum >= 4;
    } else if (planSeleccionado.tipo === 'television') {
      aplicaIva = true;
    } else if (planSeleccionado.tipo === 'combo') {
      aplicaIva = estratoNum >= 4;
    }

    if (aplicaIva) {
      valorIva = Math.round(precioBase * 0.19);
      precioFinal = precioBase + valorIva;
    }

    return {
      precio_base: precioBase,
      valor_iva: valorIva,
      precio_final: precioFinal,
      aplica_iva: aplicaIva,
      porcentaje_iva: aplicaIva ? 19 : 0
    };
  };

  useEffect(() => {
    // Recargar sectores cuando cambie la ciudad seleccionada
    const cargarSectoresPorCiudad = async () => {
      if (formData.ciudad_id) {
        try {
          const sectoresResponse = await clientService.getSectoresPorCiudad(formData.ciudad_id);
          setSectores(sectoresResponse.data || []);

          // Limpiar sector seleccionado si no pertenece a la nueva ciudad
          if (formData.sector_id) {
            const sectorExiste = sectoresResponse.data?.find(s => s.id === parseInt(formData.sector_id));
            if (!sectorExiste) {
              handleInputChange('sector_id', '');
            }
          }
        } catch (error) {
          console.error('Error cargando sectores por ciudad:', error);
          setSectores([]);
        }
      } else {
        // Si no hay ciudad seleccionada, cargar todos los sectores
        try {
          const sectoresResponse = await clientService.getSectores();
          setSectores(sectoresResponse.data || []);
        } catch (error) {
          console.error('Error cargando todos los sectores:', error);
          setSectores([]);
        }
      }
    };

    cargarSectoresPorCiudad();
  }, [formData.ciudad_id]);

  const calcularFechaVencimiento = (fechaInicio, meses) => {
    if (!fechaInicio || !meses) return '';

    const fecha = new Date(fechaInicio);
    fecha.setMonth(fecha.getMonth() + meses);

    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      console.log('🔄 Iniciando carga de datos iniciales...');

      // Cargar planes, sectores y ciudades en paralelo
      const [planesResponse, sectoresResponse, ciudadesResponse] = await Promise.all([
        configService.getServicePlans(null, true), // Solo planes activos
        clientService.getSectores(),
        clientService.getCiudades()
      ]);

      console.log('📦 Respuesta de planes:', planesResponse);
      console.log('🏘️ Respuesta de sectores:', sectoresResponse);
      console.log('🏙️ Respuesta de ciudades:', ciudadesResponse);

      // Manejar la respuesta de planes
      const planesSinCombos = (planesResponse?.data || []).filter(plan => plan.tipo !== 'combo');
      const sectores = sectoresResponse?.data || [];
      const ciudades = ciudadesResponse?.data || [];

      setPlanesDisponibles(planesSinCombos);
      setSectores(sectores);
      setCiudades(ciudades);

      // Validar que se cargaron los planes
      if (planesSinCombos.length === 0) {
        console.warn('⚠️ No se encontraron planes de servicio activos');
        setErrors(prev => ({
          ...prev,
          planes: 'No hay planes de servicio disponibles. Verifique la configuración.'
        }));
      }

    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      setErrors({
        general: 'Error cargando datos del formulario. Verifique la conexión.'
      });

      // Mostrar detalles del error en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.error('Detalles del error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosCliente = async () => {
    if (!client) return;

    try {
      // Si es edición, cargar datos del cliente y sus servicios
      const serviciosResponse = await clientService.getClientServices(client.id);
      const serviciosActivos = serviciosResponse.data.filter(s => s.estado === 'activo');

      setFormData(prev => ({
        ...prev,
        ...client,
        // Si tiene servicios activos, cargar el primero
        plan_id: serviciosActivos[0]?.plan_id || '',
        precio_personalizado: serviciosActivos[0]?.precio_personalizado || '',
        observaciones_servicio: serviciosActivos[0]?.observaciones || '',
        // En edición no generar documentos automáticamente
        generar_documentos: false,
        enviar_bienvenida: false,
        programar_instalacion: false
      }));

    } catch (error) {
      console.error('Error cargando datos del cliente:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo al cambiar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // ✅ VALIDACIÓN DEL FORMULARIO CORREGIDA
  const validarFormulario = () => {
    const nuevosErrores = {};

    // ✅ Si está en modo agregar servicio, solo validar campos de servicio
    if (modoAgregarServicio && clienteSeleccionado) {
      // Validar solo los servicios
      if (formData.usarServiciosSeparados) {
        if (!formData.planInternetId && !formData.planTelevisionId) {
          nuevosErrores.servicios_separados = 'Debe seleccionar al menos un servicio (Internet o Televisión)';
        }
      } else {
        if (!formData.plan_id) {
          nuevosErrores.plan_id = 'Debe seleccionar un plan de servicio';
        }
      }

      // Validar tipo de permanencia
      if (!formData.tipo_permanencia) {
        nuevosErrores.tipo_permanencia = 'Debe seleccionar el tipo de permanencia';
      }

      setErrors(nuevosErrores);
      return Object.keys(nuevosErrores).length === 0;
    }

    // ✅ Validaciones básicas del cliente (solo para cliente nuevo o edición)
    if (!client && !modoAgregarServicio) {
      if (!formData.identificacion.trim()) {
        nuevosErrores.identificacion = 'La identificación es requerida';
      }

      if (!formData.nombre.trim()) {
        nuevosErrores.nombre = 'El nombre es requerido';
      }

      if (!formData.email.trim()) {
        nuevosErrores.email = 'El email es requerido';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        nuevosErrores.email = 'El email no tiene un formato válido';
      }

      if (!formData.telefono.trim()) {
        nuevosErrores.telefono = 'El teléfono es requerido';
      }

      if (!formData.direccion.trim()) {
        nuevosErrores.direccion = 'La dirección es requerida';
      }

      if (!formData.ciudad_id) {
        nuevosErrores.ciudad_id = 'La ciudad es requerida';
      }
    }

    // ✅ VALIDACIÓN DE SERVICIOS Y PERMANENCIA (para clientes nuevos)
    if (!client && !modoAgregarServicio) {
      if (formData.usarServiciosSeparados) {
        // Si usa servicios separados, debe tener al menos uno seleccionado
        if (!formData.planInternetId && !formData.planTelevisionId) {
          nuevosErrores.servicios_separados = 'Debe seleccionar al menos un servicio (Internet o Televisión)';
        }
      } else {
        // Si usa plan único, debe seleccionar un plan
        if (!formData.plan_id) {
          nuevosErrores.plan_id = 'Debe seleccionar un plan de servicio';
        }
      }

      // ✅ SIEMPRE VALIDAR TIPO DE PERMANENCIA
      if (!formData.tipo_permanencia) {
        nuevosErrores.tipo_permanencia = 'Debe seleccionar el tipo de permanencia';
      }
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setSaving(true);

    try {
      if (client) {
        // Modo edición (mantener lógica original)
        await actualizarCliente();
      } else if (modoAgregarServicio && clienteSeleccionado) {
        // NUEVO: Agregar servicio a cliente existente
        await agregarServicioAClienteExistente();
      } else {
        // Crear cliente nuevo (lógica original)
        await crearClienteConSede();
      }
    } catch (error) {
      console.error('Error en submit:', error);
      setErrors({
        general: error.message || 'Error procesando la solicitud'
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CORRECCIÓN DEL ERROR: ClientForm.js - crearClienteConSede
  // ============================================================

  // FUNCIÓN CORREGIDA - crearClienteConSede en ClientForm.js
  const crearClienteConSede = async () => {
    // ✅ PREVENCIÓN DE DUPLICADOS: Verificar si hay un cliente existente detectado
    if (verificacionCliente && verificacionCliente.existe) {
      const mensaje = `Ya existe un cliente con la identificación ${formData.identificacion}. Por favor, use la opción "Agregar servicios" en lugar de crear uno nuevo.`;

      if (window.showNotification) {
        window.showNotification('error', mensaje);
      } else {
        alert(mensaje);
      }

      throw new Error(mensaje);
    }

    const datosCliente = {
      identificacion: formData.identificacion,
      tipo_documento: formData.tipo_documento,
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono,
      telefono_fijo: formData.telefono_fijo,
      direccion: formData.direccion,
      barrio: formData.barrio,
      estrato: parseInt(formData.estrato),
      ciudad_id: parseInt(formData.ciudad_id),
      sector_id: formData.sector_id ? parseInt(formData.sector_id) : null,
      observaciones: formData.observaciones,
      fecha_inicio_contrato: formData.fecha_activacion
    };

    // ✅ PREPARAR SEDE INICIAL CON SERVICIOS Y PERMANENCIA CORREGIDA
    const sedeInicial = {
      id: Date.now(), // ID temporal único
      nombre_sede: 'Sede Principal',
      direccion_servicio: formData.direccion, // ✅ CAMPO REQUERIDO
      contacto_sede: formData.nombre,
      telefono_sede: formData.telefono,
      planInternetId: null,
      planTelevisionId: null,
      precioPersonalizado: false,
      precioInternetCustom: '',
      precioTelevisionCustom: '',
      tipoContrato: formData.tipo_permanencia || 'sin_permanencia',
      mesesPermanencia: formData.tipo_permanencia === 'con_permanencia' ? 6 : 0,
      fechaActivacion: formData.fecha_activacion,
      observaciones: formData.observaciones_servicio || ''
    };

    // ✅ ASIGNAR SERVICIOS SEGÚN EL MODO SELECCIONADO
    if (formData.usarServiciosSeparados) {
      // MODO SERVICIOS SEPARADOS
      if (formData.planInternetId) {
        sedeInicial.planInternetId = parseInt(formData.planInternetId);
        if (formData.precioInternetCustom) {
          sedeInicial.precioPersonalizado = true;
          sedeInicial.precioInternetCustom = formData.precioInternetCustom;
        }
      }

      if (formData.planTelevisionId) {
        sedeInicial.planTelevisionId = parseInt(formData.planTelevisionId);
        if (formData.precioTelevisionCustom) {
          sedeInicial.precioPersonalizado = true;
          sedeInicial.precioTelevisionCustom = formData.precioTelevisionCustom;
        }
      }
    } else {
      // MODO PLAN ÚNICO
      const planSeleccionado = planesDisponibles.find(p => p.id === parseInt(formData.plan_id));
      if (!planSeleccionado) {
        throw new Error('Plan seleccionado no encontrado');
      }

      const calculos = recalcularPreciosEnTiempoReal();

      if (planSeleccionado.tipo === 'internet') {
        sedeInicial.planInternetId = parseInt(formData.plan_id);
        if (formData.precio_personalizado) {
          sedeInicial.precioPersonalizado = true;
          sedeInicial.precioInternetCustom = calculos?.precio_base?.toString() || formData.precio_personalizado;
        }
      } else if (planSeleccionado.tipo === 'television') {
        sedeInicial.planTelevisionId = parseInt(formData.plan_id);
        if (formData.precio_personalizado) {
          sedeInicial.precioPersonalizado = true;
          sedeInicial.precioTelevisionCustom = calculos?.precio_base?.toString() || formData.precio_personalizado;
        }
      } else if (planSeleccionado.tipo === 'combo') {
        sedeInicial.planInternetId = parseInt(formData.plan_id);
        sedeInicial.planTelevisionId = parseInt(formData.plan_id);

        if (formData.precio_personalizado) {
          sedeInicial.precioPersonalizado = true;
          const precioBase = calculos?.precio_base || parseFloat(formData.precio_personalizado);
          sedeInicial.precioInternetCustom = (precioBase * 0.6).toString(); // 60% Internet
          sedeInicial.precioTelevisionCustom = (precioBase * 0.4).toString(); // 40% TV
        }
      }
    }

    // ✅ VALIDAR QUE LA SEDE TENGA AL MENOS UN SERVICIO
    if (!sedeInicial.planInternetId && !sedeInicial.planTelevisionId) {
      throw new Error('Debe seleccionar al menos un servicio (Internet o Televisión)');
    }

    // ✅ ESTRUCTURA FINAL DE DATOS - USAR 'servicios' NO 'sedes'
    const datosCompletos = {
      cliente: datosCliente,
      servicios: [sedeInicial], // ✅ CORRECCIÓN: Usar 'servicios' como espera el backend
      opciones: {
        generar_documentos: formData.generar_documentos,
        enviar_bienvenida: formData.enviar_bienvenida,
        programar_instalacion: formData.programar_instalacion
      }
    };

    console.log('🚀 Datos enviados al servidor:', datosCompletos);
    console.log('📍 Verificación de sede:', {
      direccion_servicio: sedeInicial.direccion_servicio,
      internet: !!sedeInicial.planInternetId,
      television: !!sedeInicial.planTelevisionId,
      tipo_contrato: sedeInicial.tipoContrato
    });

    // LLAMAR AL SERVICIO
    const response = await clienteCompletoService.createClienteCompleto(datosCompletos);

    if (response.success) {
      console.log('✅ Cliente creado exitosamente:', response.data);

      const resumen = response.data.resumen || response.data;
      const mensaje = `Cliente creado exitosamente:
• ${resumen.total_sedes || 1} sede(s)
• ${resumen.total_contratos || 1} contrato(s)
• ${resumen.total_facturas || 1} factura(s)
• ${resumen.total_servicios || 1} servicio(s)`;

      if (window.showNotification) {
        window.showNotification('success', mensaje);
      } else {
        alert(mensaje);
      }

      onSave(response.data);
    }
  };

  const actualizarCliente = async () => {
    const datosActualizacion = {
      identificacion: formData.identificacion,
      tipo_documento: formData.tipo_documento,
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono,
      telefono_fijo: formData.telefono_fijo,
      direccion: formData.direccion,
      barrio: formData.barrio,
      estrato: formData.estrato,
      ciudad_id: formData.ciudad_id,
      sector_id: formData.sector_id,
      observaciones: formData.observaciones
    };

    const response = await clientService.updateClient(client.id, datosActualizacion);

    if (response.success) {
      if (window.showNotification) {
        window.showNotification('success', 'Cliente actualizado exitosamente');
      }
      onSave(response.data);
    }
  };

 const planSeleccionado = planesDisponibles.find(p => p.id == formData.plan_id);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          {client ? 'Actualizando...' : modoAgregarServicio ? 'Agregando...' : 'Creando...'}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0e6493] to-[#0a5273]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {client ? 'Editar Cliente' : modoAgregarServicio ? 'Agregar Servicio' : 'Nuevo Cliente'}
              </h2>
              <p className="text-sm text-white/90">
                {client ? 'Actualizar información del cliente' :
                  modoAgregarServicio ? `Agregar nuevo servicio a ${clienteSeleccionado?.nombre}` :
                    'Crear cliente con servicio automático'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">

          {/* Error general */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{errors.general}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* COLUMNA 1: DATOS BÁSICOS DEL CLIENTE */}
            <div className="space-y-6">
              <div className="border-b-2 border-[#0e6493]/20 pb-4">
                <h3 className="text-lg font-semibold text-[#0e6493] flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Datos del Cliente
                </h3>
              </div>

              {/* Identificación */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Documento
                  </label>
                  <select
                    value={formData.tipo_documento}
                    onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
                    disabled={modoAgregarServicio}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100"
                  >
                    <option value="cedula">Cédula</option>
                    <option value="nit">NIT</option>
                    <option value="pasaporte">Pasaporte</option>
                    <option value="extranjeria">C.E.</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Identificación <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    value={formData.identificacion}
                    onChange={(e) => handleInputChange('identificacion', e.target.value)}
                    disabled={modoAgregarServicio}
                    className={`w-full max-w-[400px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100 transition-all ${
                      errors.identificacion ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1234567890"
                  />

                  {errors.identificacion && (
                    <p className="mt-1 text-sm text-red-600 break-words max-w-[400px]">
                      {errors.identificacion}
                    </p>
                  )}
                </div>
              </div>

              {/* Alerta de cliente existente - Ahora abarca todo el ancho */}
              {verificacionCliente && !client && (
                <div className="w-full">
                  <AlertaClienteExistente
                    verificacion={verificacionCliente}
                    onContinuarConCliente={manejarContinuarConClienteExistente}
                    onCrearNuevo={manejarCrearNuevo}
                    onVerHistorial={manejarVerHistorial}
                  />
                </div>
              )}

              {modoAgregarServicio && clienteSeleccionado && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Cliente seleccionado</h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    Se agregará el nuevo servicio a: <span className="font-medium">{clienteSeleccionado.nombre}</span>
                  </p>
                  <button
                    type="button"
                    onClick={manejarCrearNuevo}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Cambiar a crear cliente nuevo
                  </button>
                </div>
              )}

              {/* Nombre completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  disabled={modoAgregarServicio}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100 ${errors.nombre ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Juan Pérez López"
                />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                )}
              </div>

              {/* Email y teléfonos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={modoAgregarServicio}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100 ${errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="cliente@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono Móvil <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    disabled={modoAgregarServicio}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100 ${errors.telefono ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="3001234567"
                  />
                  {errors.telefono && (
                    <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono Fijo (Opcional)
                </label>
                <input
                  type="tel"
                  value={formData.telefono_fijo}
                  onChange={(e) => handleInputChange('telefono_fijo', e.target.value)}
                  disabled={modoAgregarServicio}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100"
                  placeholder="6012345678"
                />
              </div>

              {/* Ubicación */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => handleInputChange('direccion', e.target.value)}
                      disabled={modoAgregarServicio}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100 ${errors.direccion ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Calle 123 # 45-67"
                    />
                    {errors.direccion && (
                      <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barrio
                      </label>
                      <input
                        type="text"
                        value={formData.barrio}
                        onChange={(e) => handleInputChange('barrio', e.target.value)}
                        disabled={modoAgregarServicio}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100"
                        placeholder="Centro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estrato
                      </label>
                      <select
                        value={formData.estrato}
                        onChange={(e) => handleInputChange('estrato', e.target.value)}
                        disabled={modoAgregarServicio}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100"
                      >
                        <option value="1">Estrato 1</option>
                        <option value="2">Estrato 2</option>
                        <option value="3">Estrato 3</option>
                        <option value="4">Estrato 4</option>
                        <option value="5">Estrato 5</option>
                        <option value="6">Estrato 6</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ciudad <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.ciudad_id}
                        onChange={(e) => handleInputChange('ciudad_id', e.target.value)}
                        disabled={modoAgregarServicio}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100 ${errors.ciudad_id ? 'border-red-500' : 'border-gray-300'
                          }`}
                      >
                        <option value="">Seleccionar ciudad</option>
                        {ciudades.map(ciudad => (
                          <option key={ciudad.id} value={ciudad.id}>
                            {ciudad.nombre}
                          </option>
                        ))}
                      </select>
                      {errors.ciudad_id && (
                        <p className="mt-1 text-sm text-red-600">{errors.ciudad_id}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sector
                      </label>
                      <select
                        value={formData.sector_id}
                        onChange={(e) => handleInputChange('sector_id', e.target.value)}
                        disabled={modoAgregarServicio}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] disabled:bg-gray-100"
                      >
                        <option value="">Seleccionar sector</option>
                        {sectores.map(sector => (
                          <option key={sector.id} value={sector.id}>
                            {sector.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>  {/* ✅ CIERRE DE COLUMNA 1 (space-y-6) */}

            {/* COLUMNA 2: DATOS DEL SERVICIO */}
            <div className="space-y-6">
              <div className="border-b-2 border-[#0e6493]/20 pb-4">
                <h3 className="text-lg font-semibold text-[#0e6493] flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  {client ? 'Cambiar Plan' : 'Asignar Servicio'}
                </h3>
                {!client && (
                  <p className="text-sm text-gray-500 mt-1">
                    Al crear el cliente se generará automáticamente el contrato, orden de instalación y primera factura.
                  </p>
                )}
              </div>

              {!client && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.usarServiciosSeparados}
                      onChange={(e) => handleInputChange('usarServiciosSeparados', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Seleccionar Internet y TV por separado</span>
                  </label>
                </div>
              )}

              {/* Selección tradicional (un solo plan) */}
              {!formData.usarServiciosSeparados && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan de Servicio {!client && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => handleInputChange('plan_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] ${errors.plan_id ? 'border-red-300' : 'border-gray-300'}`}
                    disabled={client && !permissions?.canEdit}
                  >
                    <option value="">Seleccionar plan</option>
                    {planesDisponibles.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} - ${plan.precio.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {errors.plan_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.plan_id}</p>
                  )}
                </div>
              )}

              {/* Selección separada (Internet + TV) */}
              {formData.usarServiciosSeparados && (
                <div className="space-y-4">
                  {/* Internet */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center mb-3">
                      <Wifi className="w-5 h-5 text-[#0e6493] mr-2" />
                      <h4 className="font-medium text-gray-900">Internet</h4>
                    </div>
                    <select
                      value={formData.planInternetId}
                      onChange={(e) => handleInputChange('planInternetId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] bg-white"
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

                  {/* Televisión */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center mb-3">
                      <Tv className="w-5 h-5 text-[#0e6493] mr-2" />
                      <h4 className="font-medium text-gray-900">Televisión</h4>
                    </div>
                    <select
                      value={formData.planTelevisionId}
                      onChange={(e) => handleInputChange('planTelevisionId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] bg-white"
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

                  {errors.servicios_separados && (
                    <p className="mt-1 text-sm text-red-600">{errors.servicios_separados}</p>
                  )}
                </div>
              )}

              {/* ✅ SELECTOR DE PERMANENCIA - SIEMPRE VISIBLE PARA NUEVOS CLIENTES */}
              {!client && <SelectorPermanenciaCompleto />}

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
                    onChange={(e) => handleInputChange('precio_personalizado', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                    placeholder="Dejar vacío para usar precio del plan"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Si se especifica, este precio se usará en lugar del precio del plan
                </p>
              </div>

              {/* Fecha de activación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Activación
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.fecha_activacion}
                    onChange={(e) => handleInputChange('fecha_activacion', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Observaciones del servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones del Servicio
                </label>
                <textarea
                  value={formData.observaciones_servicio}
                  onChange={(e) => handleInputChange('observaciones_servicio', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                  placeholder="Observaciones especiales sobre el servicio..."
                />
              </div>

              {/* Opciones de creación automática (solo para cliente nuevo) */}
              {!client && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-gray-900 flex items-center gap-2 mb-4">
                    <Settings className="w-4 h-4" />
                    Opciones de Creación Automática
                  </h4>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.generar_documentos}
                        onChange={(e) => handleInputChange('generar_documentos', e.target.checked)}
                        className="w-4 h-4 text-[#0e6493] border-gray-300 rounded focus:ring-[#0e6493]"
                      />
                      <span className="text-sm text-gray-700">
                        Generar contrato y orden de instalación automáticamente
                      </span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.enviar_bienvenida}
                        onChange={(e) => handleInputChange('enviar_bienvenida', e.target.checked)}
                        className="w-4 h-4 text-[#0e6493] border-gray-300 rounded focus:ring-[#0e6493]"
                      />
                      <span className="text-sm text-gray-700">
                        Enviar email de bienvenida al cliente
                      </span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.programar_instalacion}
                        onChange={(e) => handleInputChange('programar_instalacion', e.target.checked)}
                        className="w-4 h-4 text-[#0e6493] border-gray-300 rounded focus:ring-[#0e6493]"
                      />
                      <span className="text-sm text-gray-700">
                        Programar instalación automáticamente
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> Al crear el cliente se generará automáticamente la primera factura
                      con el costo de instalación calculado según el tipo de permanencia seleccionado.
                    </p>
                  </div>
                </div>
              )}

              {/* Observaciones generales */}
              <div className="border-t-2 border-[#0e6493]/10 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones Generales
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]"
                  placeholder="Observaciones adicionales sobre el cliente..."
                />
              </div>
            </div>  {/* ✅ CIERRE DE COLUMNA 2 (space-y-6) */}
          </div>  {/* ✅ CIERRE DEL GRID DE 2 COLUMNAS */}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t-2 border-gray-200 mt-8 bg-gray-50 p-6 -mx-6 -mb-6 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-all shadow-sm hover:shadow"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#0e6493] to-[#0a5273] text-white rounded-lg hover:from-[#0a5273] hover:to-[#0e6493] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {client ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {client ? 'Actualizar Cliente' :
                    modoAgregarServicio ? 'Agregar Servicio' :
                      'Crear Cliente Completo'}
                </>
              )}
            </button>
          </div>
        </form>  
      </div>  
    </div>  
  );
};

export default ClientForm;