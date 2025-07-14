// frontend/src/components/Clients/ClientForm.js
// Formulario mejorado de cliente con asignación de servicios

import React, { useState, useEffect } from 'react';
import {
  X, Save, Loader2, User, MapPin, Phone, Mail,
  CreditCard, Building, Wifi, Tv, AlertCircle, Check, // ← Agregar Tv aquí
  Calendar, DollarSign, Settings, Clock
} from 'lucide-react';
import { clientService } from '../../services/clientService';
import configService, { ConfigService } from '../../services/configService';
import clienteCompletoService from '../../services/clienteCompletoService';

const ClientForm = ({ client, onClose, onSave, permissions }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [ciudades, setCiudades] = useState([]);
   const planesInternet = planesDisponibles.filter(p => p.tipo === 'internet');
    const planesTelevision = planesDisponibles.filter(p => p.tipo === 'television');

  // Estado del formulario
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
    tipo_permanencia: 'sin_permanencia',
    precio_personalizado: '',
    fecha_activacion: new Date().toISOString().split('T')[0],
    observaciones_servicio: '',
    planInternetId: '',
    planTelevisionId: '',
    precioInternetCustom: '',
    precioTelevisionCustom: '',
    usarServiciosSeparados: false,

    // Configuración adicional
    generar_documentos: true,
    enviar_bienvenida: true,
    programar_instalacion: true
  });

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
      aplicaIva = estratoNum >= 4;  // ✅ CORRECTO
    } else if (planSeleccionado.tipo === 'television') {
      aplicaIva = true;
    } else if (planSeleccionado.tipo === 'combo') {
      aplicaIva = estratoNum >= 4;  // ✅ CORRECTO
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

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validaciones básicas
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

    // Para cliente nuevo, validar plan
    if (!client && !formData.plan_id) {
      nuevosErrores.plan_id = 'Debe seleccionar un plan de servicio';
    }
    if (!client && formData.plan_id) {
      const planSeleccionado = planesDisponibles.find(p => p.id === parseInt(formData.plan_id));
      if (planSeleccionado?.aplica_permanencia && !formData.tipo_permanencia) {
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

  try {
    setSaving(true);
    setErrors({});

    if (client) {
      // MODO EDICIÓN (mantener igual)
      await actualizarCliente();
    } else {
      // MODO CREACIÓN - CORREGIR AQUÍ: Usar crearClienteConSede (no crearClienteCompleto)
      await crearClienteConSede(); // ✅ Esta función ya existe y está bien
    }

  } catch (error) {
    console.error('❌ Error en formulario:', error);
    setErrors({
      general: error.message || 'Error al procesar la información'
    });
  } finally {
    setSaving(false);
  }
};

  const crearClienteConSede = async () => {
  const calculos = recalcularPreciosEnTiempoReal();

  // 1. PREPARAR DATOS DEL CLIENTE (igual que antes)
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

  // 2. OBTENER EL PLAN SELECCIONADO
  const planSeleccionado = planesDisponibles.find(p => p.id === parseInt(formData.plan_id));
  if (!planSeleccionado) {
    throw new Error('Plan seleccionado no encontrado');
  }

  // 3. PREPARAR SEDE INICIAL CON SERVICIOS
  const sedeInicial = {
    id: Date.now(), // ID temporal único
    nombre_sede: 'Sede Principal',
    direccion_servicio: formData.direccion,
    contacto_sede: formData.nombre,
    telefono_sede: formData.telefono,
    planInternetId: null,
    planTelevisionId: null,
    precioPersonalizado: !!formData.precio_personalizado,
    precioInternetCustom: '',
    precioTelevisionCustom: '',
    tipoContrato: formData.tipo_permanencia || 'sin_permanencia',
    mesesPermanencia: formData.tipo_permanencia === 'con_permanencia' ? 6 : 0,
    fechaActivacion: formData.fecha_activacion,
    observaciones: formData.observaciones_servicio || ''
  };

  // 4. ASIGNAR SERVICIOS SEGÚN EL TIPO DE PLAN
  if (planSeleccionado.tipo === 'internet') {
    // Solo Internet
    sedeInicial.planInternetId = parseInt(formData.plan_id);
    if (formData.precio_personalizado) {
      sedeInicial.precioInternetCustom = calculos.precio_base.toString();
    }
  } else if (planSeleccionado.tipo === 'television') {
    // Solo Televisión
    sedeInicial.planTelevisionId = parseInt(formData.plan_id);
    if (formData.precio_personalizado) {
      sedeInicial.precioTelevisionCustom = calculos.precio_base.toString();
    }
  } else if (planSeleccionado.tipo === 'combo') {
    // COMBO = Internet + TV (usar el mismo plan para ambos por ahora)
    sedeInicial.planInternetId = parseInt(formData.plan_id);
    sedeInicial.planTelevisionId = parseInt(formData.plan_id);

    if (formData.precio_personalizado) {
      // Dividir el precio personalizado entre Internet y TV
      const precioBase = calculos.precio_base;
      sedeInicial.precioInternetCustom = (precioBase * 0.6).toString(); // 60% Internet
      sedeInicial.precioTelevisionCustom = (precioBase * 0.4).toString(); // 40% TV
    }
  }

  // 5. ESTRUCTURA FINAL DE DATOS (FORMATO CORRECTO PARA EL BACKEND)
  const datosCompletos = {
    cliente: datosCliente,
    servicios: [sedeInicial], // ✅ Array con una sede inicial
    opciones: {
      generar_documentos: formData.generar_documentos,
      enviar_bienvenida: formData.enviar_bienvenida,
      programar_instalacion: formData.programar_instalacion
    }
  };

  console.log('🚀 Creando cliente con sede inicial:', datosCompletos);

  // 6. LLAMAR AL SERVICIO CORRECTO
  const response = await clienteCompletoService.createClienteCompleto(datosCompletos);

  if (response.success) {
    console.log('✅ Cliente creado exitosamente:', response.data);

    // Mostrar mensaje de éxito
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

    // Llamar callback de éxito
    onSave(response.data);
  }
};
  const crearClienteCompleto = async () => {
    const calculos = recalcularPreciosEnTiempoReal();
    // Preparar datos para crear cliente completo
    const datosCompletos = {
      cliente: {
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
        observaciones: formData.observaciones,
        fecha_inicio_contrato: formData.fecha_activacion
      },
      servicio: {
        plan_id: parseInt(formData.plan_id),
        precio_personalizado: calculos.precio_final,  // ✅ Precio CON IVA incluido
        precio_sin_iva: calculos.precio_base,         // ✅ Precio base sin IVA
        valor_iva: calculos.valor_iva,                // ✅ Valor del IVA
        aplica_iva: calculos.aplica_iva,              // ✅ Si aplica IVA
        fecha_activacion: formData.fecha_activacion,
        observaciones: formData.observaciones_servicio
      },
      opciones: {
        generar_documentos: formData.generar_documentos,
        enviar_bienvenida: formData.enviar_bienvenida,
        programar_instalacion: formData.programar_instalacion
      }
    };

    const response = await clienteCompletoService.createClienteCompleto(datosCompletos);

    // Mostrar resumen de lo que se generó
    if (response.documentos_generados) {
      mostrarResumenCreacion(response);
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

  const actualizarServicioCliente = async () => {
    const datosServicio = {
      plan_id: formData.plan_id,
      precio_personalizado: formData.precio_personalizado || null,
      observaciones: formData.observaciones_servicio
    };

    await clientService.updateClientService(client.id, datosServicio);
  };

  const verificarCalculosIVA = (estrato, tipoServicio, precioBase) => {
    console.log('🔍 Verificando cálculo IVA:');
    console.log(`  - Estrato: ${estrato}`);
    console.log(`  - Tipo: ${tipoServicio}`);
    console.log(`  - Precio base: ${precioBase}`);

    let aplicaIva = false;

    if (tipoServicio === 'internet' || tipoServicio === 'combo') {
      aplicaIva = parseInt(estrato) >= 4;
    } else if (tipoServicio === 'television') {
      aplicaIva = true;
    }

    const valorIva = aplicaIva ? Math.round(precioBase * 0.19) : 0;
    const precioFinal = precioBase + valorIva;

    console.log(`  - Aplica IVA: ${aplicaIva}`);
    console.log(`  - Valor IVA: ${valorIva}`);
    console.log(`  - Precio final: ${precioFinal}`);

    return { aplicaIva, valorIva, precioFinal };
  };
  const mostrarResumenCreacion = (response) => {
    const documentos = response.documentos_generados;
    let mensaje = `Cliente creado exitosamente.\n\n`;

    if (documentos.contrato) {
      mensaje += `✅ Contrato generado: ${documentos.contrato.numero}\n`;
    }

    if (documentos.orden_instalacion) {
      mensaje += `✅ Orden de instalación: ${documentos.orden_instalacion.numero}\n`;
    }

    if (documentos.factura) {
      mensaje += `✅ Primera factura: ${documentos.factura.numero_factura}\n`;
      mensaje += `   Total: $${documentos.factura.total.toLocaleString()}\n`;
    }

    if (response.email_enviado) {
      mensaje += `✅ Email de bienvenida enviado\n`;
    }

    alert(mensaje);
  };

  const planSeleccionado = planesDisponibles.find(p => p.id == formData.plan_id);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando formulario...</p>
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
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {client ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-sm text-gray-500">
                {client ? 'Actualizar información del cliente' : 'Crear cliente con servicio automático'}
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
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.identificacion ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="1234567890"
                  />
                  {errors.identificacion && (
                    <p className="mt-1 text-sm text-red-600">{errors.identificacion}</p>
                  )}
                </div>
              </div>

              {/* Nombre completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nombre ? 'border-red-300' : 'border-gray-300'
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.telefono ? 'border-red-300' : 'border-gray-300'
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.direccion ? 'border-red-300' : 'border-gray-300'
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ciudad_id ? 'border-red-300' : 'border-gray-300'
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>

            {/* COLUMNA 2: DATOS DEL SERVICIO */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.plan_id ? 'border-red-300' : 'border-gray-300'}`}
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
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Wifi className="w-5 h-5 text-blue-600 mr-2" />
                      <h4 className="font-medium text-gray-900">Internet</h4>
                    </div>
                    <select
                      value={formData.planInternetId}
                      onChange={(e) => handleInputChange('planInternetId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Tv className="w-5 h-5 text-purple-600 mr-2" />
                      <h4 className="font-medium text-gray-900">Televisión</h4>
                    </div>
                    <select
                      value={formData.planTelevisionId}
                      onChange={(e) => handleInputChange('planTelevisionId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                </div>
              )}
              {formData.plan_id && planesDisponibles.find(p => p.id === parseInt(formData.plan_id))?.aplica_permanencia && (
                <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4" />
                    Tipo de Permanencia
                  </h4>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_permanencia"
                        value="con_permanencia"
                        checked={formData.tipo_permanencia === 'con_permanencia'}
                        onChange={(e) => handleInputChange('tipo_permanencia', e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-green-700">Con Permanencia (6 meses)</div>
                        <div className="text-sm text-green-600">
                          Instalación: $50,000 - Ahorra $100,000
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          El cliente se compromete a mantener el servicio por 6 meses mínimo
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_permanencia"
                        value="sin_permanencia"
                        checked={formData.tipo_permanencia === 'sin_permanencia'}
                        onChange={(e) => handleInputChange('tipo_permanencia', e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-blue-700">Sin Permanencia</div>
                        <div className="text-sm text-blue-600">
                          Instalación: $150,000 - Sin compromisos
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          El cliente puede cancelar el servicio en cualquier momento
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Mostrar cálculo del costo total */}
                  <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Costo de instalación:</span>
                      <span className="text-lg font-bold text-green-600">
                        ${formData.tipo_permanencia === 'con_permanencia' ? '50,000' : '150,000'}
                      </span>
                    </div>
                    {formData.tipo_permanencia === 'con_permanencia' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Vencimiento permanencia: {calcularFechaVencimiento(formData.fecha_activacion, 6)}
                      </div>
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
                    onChange={(e) => handleInputChange('precio_personalizado', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Programar instalación automáticamente
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> Al crear el cliente se generará automáticamente la primera factura
                      con el cargo de instalación ($42,016 + IVA) y el primer período de servicio según las reglas de facturación.
                    </p>
                  </div>
                </div>
              )}

              {/* Observaciones generales */}
              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones Generales
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observaciones adicionales sobre el cliente..."
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {client ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {client ? 'Actualizar Cliente' : 'Crear Cliente Completo'}
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