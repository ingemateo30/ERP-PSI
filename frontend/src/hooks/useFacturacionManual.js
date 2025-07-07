// frontend/src/hooks/useFacturacionManual.js
// Hook personalizado para gestión de facturación manual

import { useState, useCallback, useEffect } from 'react';
import facturacionManualService, { ESTADOS_FACTURA, METODOS_PAGO } from '../services/facturacionManualService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook personalizado para gestión de facturación manual
 * Proporciona todas las funcionalidades necesarias para CRUD de facturas
 */
export const useFacturacionManual = () => {
  // Estados principales
  const [facturas, setFacturas] = useState([]);
  const [facturaActual, setFacturaActual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Estados de paginación y filtros
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  const [filtros, setFiltros] = useState({
    search: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    cliente_id: '',
    ruta: ''
  });

  // Estados de estadísticas
  const [estadisticas, setEstadisticas] = useState(null);

  // Contexto de autenticación
  const { user, hasPermission } = useAuth();

  // ==========================================
  // UTILIDADES DE ESTADO
  // ==========================================

  /**
   * Limpiar errores
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Limpiar mensajes de éxito
   */
  const clearSuccess = useCallback(() => {
    setSuccess(null);
  }, []);

  /**
   * Limpiar todos los mensajes
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  /**
   * Manejar errores de forma centralizada
   */
  const handleError = useCallback((error, defaultMessage = 'Error desconocido') => {
    console.error('❌ Error en hook facturación manual:', error);
    
    let errorMessage = defaultMessage;
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    setError(errorMessage);
    setLoading(false);
  }, []);

  /**
   * Manejar éxito
   */
  const handleSuccess = useCallback((message) => {
    setSuccess(message);
    setError(null);
  }, []);

  // ==========================================
  // OPERACIONES CRUD
  // ==========================================

  /**
   * Cargar lista de facturas con filtros
   */
  const cargarFacturas = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const parametros = {
        ...filtros,
        ...params,
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit
      };

      console.log('📋 Cargando facturas con parámetros:', parametros);

      const response = await facturacionManualService.obtenerFacturas(parametros);

      if (response?.facturas) {
        setFacturas(response.facturas);
        
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            ...response.pagination
          }));
        }
        
        if (response.stats) {
          setEstadisticas(response.stats);
        }
      } else if (Array.isArray(response?.data)) {
        setFacturas(response.data);
      }

      console.log('✅ Facturas cargadas exitosamente');
    } catch (error) {
      handleError(error, 'Error cargando facturas');
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, [filtros, pagination.page, pagination.limit, handleError]);

  /**
   * Cargar factura específica por ID
   */
  const cargarFactura = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Cargando factura ID: ${id}`);

      const response = await facturacionManualService.obtenerFacturaPorId(id);
      
      if (response?.data) {
        setFacturaActual(response.data);
        console.log('✅ Factura cargada exitosamente');
        return response.data;
      }
      
      return null;
    } catch (error) {
      handleError(error, 'Error cargando factura');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  /**
   * Crear nueva factura manual
   */
  const crearFactura = useCallback(async (datosFactura) => {
    try {
      setLoading(true);
      setError(null);

      console.log('➕ Creando nueva factura manual');

      // Formatear datos antes de enviar
      const datosFormateados = facturacionManualService.formatearDatosFactura(datosFactura);

      const response = await facturacionManualService.crearFacturaManual(datosFormateados);

      if (response?.data) {
        // Agregar a la lista local
        setFacturas(prev => [response.data, ...prev]);
        setFacturaActual(response.data);
        
        handleSuccess('Factura creada exitosamente');
        
        console.log('✅ Factura creada exitosamente');
        return response.data;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error creando factura');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess]);

  /**
   * Actualizar factura existente
   */
  const actualizarFactura = useCallback(async (id, datosFactura) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`✏️ Actualizando factura ID: ${id}`);

      // Formatear datos antes de enviar
      const datosFormateados = facturacionManualService.formatearDatosFactura(datosFactura);

      const response = await facturacionManualService.actualizarFactura(id, datosFormateados);

      if (response?.data) {
        // Actualizar en la lista local
        setFacturas(prev => 
          prev.map(factura => 
            factura.id === id ? { ...factura, ...response.data } : factura
          )
        );
        
        setFacturaActual(response.data);
        
        handleSuccess('Factura actualizada exitosamente');
        
        console.log('✅ Factura actualizada exitosamente');
        return response.data;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error actualizando factura');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess]);

  /**
   * Duplicar factura existente
   */
  const duplicarFactura = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📋 Duplicando factura ID: ${id}`);

      const response = await facturacionManualService.duplicarFactura(id);

      if (response?.data) {
        // Agregar copia a la lista local
        setFacturas(prev => [response.data, ...prev]);
        setFacturaActual(response.data);
        
        handleSuccess('Factura duplicada exitosamente');
        
        console.log('✅ Factura duplicada exitosamente');
        return response.data;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error duplicando factura');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess]);

  // ==========================================
  // GESTIÓN DE PAGOS
  // ==========================================

  /**
   * Registrar pago de factura
   */
  const registrarPago = useCallback(async (facturaId, datosPago) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`💰 Registrando pago para factura: ${facturaId}`);

      const response = await facturacionManualService.registrarPago(facturaId, datosPago);

      if (response?.data) {
        // Actualizar estado de la factura en la lista local
        setFacturas(prev => 
          prev.map(factura => 
            factura.id === facturaId 
              ? { 
                  ...factura, 
                  estado: response.data.nuevo_estado || 'pagada',
                  fecha_pago: new Date().toISOString().split('T')[0],
                  valor_pagado: response.data.valor_pagado,
                  saldo_pendiente: response.data.saldo_pendiente || 0
                }
              : factura
          )
        );
        
        // Actualizar factura actual si es la misma
        if (facturaActual?.id === facturaId) {
          setFacturaActual(prev => ({
            ...prev,
            estado: response.data.nuevo_estado || 'pagada',
            fecha_pago: new Date().toISOString().split('T')[0],
            valor_pagado: response.data.valor_pagado,
            saldo_pendiente: response.data.saldo_pendiente || 0
          }));
        }
        
        handleSuccess('Pago registrado exitosamente');
        
        console.log('✅ Pago registrado exitosamente');
        return response.data;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error registrando pago');
      return null;
    } finally {
      setLoading(false);
    }
  }, [facturaActual, handleError, handleSuccess]);

  /**
   * Anular factura
   */
  const anularFactura = useCallback(async (id, motivo = '') => {
    try {
      setLoading(true);
      setError(null);

      console.log(`❌ Anulando factura ID: ${id}`);

      const response = await facturacionManualService.anularFactura(id, motivo);

      if (response?.success) {
        // Actualizar estado en la lista local
        setFacturas(prev => 
          prev.map(factura => 
            factura.id === id 
              ? { ...factura, estado: 'anulada', motivo_anulacion: motivo }
              : factura
          )
        );
        
        // Actualizar factura actual si es la misma
        if (facturaActual?.id === id) {
          setFacturaActual(prev => ({
            ...prev,
            estado: 'anulada',
            motivo_anulacion: motivo
          }));
        }
        
        handleSuccess('Factura anulada exitosamente');
        
        console.log('✅ Factura anulada exitosamente');
        return true;
      }

      return false;
    } catch (error) {
      handleError(error, 'Error anulando factura');
      return false;
    } finally {
      setLoading(false);
    }
  }, [facturaActual, handleError, handleSuccess]);

  // ==========================================
  // BÚSQUEDAS Y FILTROS
  // ==========================================

  /**
   * Buscar facturas con criterios específicos
   */
  const buscarFacturas = useCallback(async (criterios = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Buscando facturas con criterios:', criterios);

      const response = await facturacionManualService.buscarFacturas(criterios);

      if (response?.data) {
        setFacturas(Array.isArray(response.data) ? response.data : []);
        
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            ...response.pagination
          }));
        }
        
        console.log('✅ Búsqueda completada exitosamente');
        return response.data;
      }

      return [];
    } catch (error) {
      handleError(error, 'Error buscando facturas');
      return [];
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  /**
   * Obtener facturas vencidas
   */
  const cargarFacturasVencidas = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('⏰ Cargando facturas vencidas');

      const response = await facturacionManualService.obtenerFacturasVencidas(params);

      if (response?.data) {
        // Si es una búsqueda específica, no reemplazar la lista principal
        if (params.separateList) {
          console.log('✅ Facturas vencidas cargadas exitosamente');
          return response.data;
        } else {
          setFacturas(Array.isArray(response.data) ? response.data : []);
        }
        
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            ...response.pagination
          }));
        }
      }

      return response?.data || [];
    } catch (error) {
      handleError(error, 'Error cargando facturas vencidas');
      return [];
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // ==========================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================

  /**
   * Cargar estadísticas de facturas
   */
  const cargarEstadisticas = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Cargando estadísticas de facturas');

      const response = await facturacionManualService.obtenerEstadisticas(params);

      if (response?.data) {
        setEstadisticas(response.data);
        console.log('✅ Estadísticas cargadas exitosamente');
        return response.data;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error cargando estadísticas');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // ==========================================
  // GENERACIÓN DE DOCUMENTOS
  // ==========================================

  /**
   * Generar y descargar PDF de factura
   */
  const descargarPDF = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📄 Descargando PDF de factura: ${id}`);

      await facturacionManualService.generarPDF(id, true);
      
      handleSuccess('PDF descargado exitosamente');
      console.log('✅ PDF descargado exitosamente');
      
      return true;
    } catch (error) {
      handleError(error, 'Error descargando PDF');
      return false;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess]);

  /**
   * Ver PDF en navegador
   */
  const verPDF = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`👁️ Visualizando PDF de factura: ${id}`);

      await facturacionManualService.verPDF(id);
      
      console.log('✅ PDF visualizado exitosamente');
      return true;
    } catch (error) {
      handleError(error, 'Error visualizando PDF');
      return false;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // ==========================================
  // UTILIDADES
  // ==========================================

  /**
   * Generar número de factura
   */
  const generarNumeroFactura = useCallback(async () => {
    try {
      setError(null);

      console.log('🔢 Generando número de factura');

      const response = await facturacionManualService.generarNumeroFactura();

      if (response?.data?.numero) {
        console.log('✅ Número de factura generado:', response.data.numero);
        return response.data.numero;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error generando número de factura');
      return null;
    }
  }, [handleError]);

  /**
   * Validar número de factura
   */
  const validarNumeroFactura = useCallback(async (numero) => {
    try {
      setError(null);

      console.log(`✅ Validando número de factura: ${numero}`);

      const response = await facturacionManualService.validarNumeroFactura(numero);

      return response?.data?.valido || false;
    } catch (error) {
      console.error('Error validando número de factura:', error);
      return false;
    }
  }, []);

  /**
   * Calcular totales de factura
   */
  const calcularTotales = useCallback((datosFactura) => {
    return facturacionManualService.calcularTotales(datosFactura);
  }, []);

  // ==========================================
  // GESTIÓN DE FILTROS Y PAGINACIÓN
  // ==========================================

  /**
   * Actualizar filtros
   */
  const actualizarFiltros = useCallback((nuevosFiltros) => {
    setFiltros(prev => ({
      ...prev,
      ...nuevosFiltros
    }));
    
    // Resetear paginación al cambiar filtros
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  }, []);

  /**
   * Limpiar filtros
   */
  const limpiarFiltros = useCallback(() => {
    setFiltros({
      search: '',
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
      cliente_id: '',
      ruta: ''
    });
    
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  }, []);

  /**
   * Cambiar página
   */
  const cambiarPagina = useCallback((nuevaPagina) => {
    setPagination(prev => ({
      ...prev,
      page: nuevaPagina
    }));
  }, []);

  /**
   * Cambiar límite por página
   */
  const cambiarLimite = useCallback((nuevoLimite) => {
    setPagination(prev => ({
      ...prev,
      limit: nuevoLimite,
      page: 1 // Resetear a primera página
    }));
  }, []);

  // ==========================================
  // FACTURACIÓN AUTOMÁTICA
  // ==========================================

  /**
   * Generar facturación mensual masiva
   */
  const generarFacturacionMensual = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Iniciando facturación mensual masiva');

      const response = await facturacionManualService.generarFacturacionMensual(params);

      if (response?.data) {
        handleSuccess(`Facturación mensual completada: ${response.data.exitosas} exitosas, ${response.data.fallidas} fallidas`);
        
        // Recargar lista de facturas
        await cargarFacturas();
        
        console.log('✅ Facturación mensual completada');
        return response.data;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error en facturación mensual');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess, cargarFacturas]);

  /**
   * Generar factura individual para cliente
   */
  const generarFacturaIndividual = useCallback(async (clienteId, params = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🧾 Generando factura individual para cliente: ${clienteId}`);

      const response = await facturacionManualService.generarFacturaIndividual(clienteId, params);

      if (response?.data) {
        // Agregar nueva factura a la lista
        setFacturas(prev => [response.data, ...prev]);
        
        handleSuccess('Factura individual generada exitosamente');
        
        console.log('✅ Factura individual generada');
        return response.data;
      }

      return null;
    } catch (error) {
      handleError(error, 'Error generando factura individual');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, handleSuccess]);

  // ==========================================
  // EFECTOS
  // ==========================================

  /**
   * Cargar facturas al montar el componente o cambiar filtros/paginación
   */
  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  /**
   * Limpiar mensajes después de un tiempo
   */
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ==========================================
  // RETURN DEL HOOK
  // ==========================================

  return {
    // Estados principales
    facturas,
    facturaActual,
    loading,
    error,
    success,
    estadisticas,
    pagination,
    filtros,

    // Operaciones CRUD
    cargarFacturas,
    cargarFactura,
    crearFactura,
    actualizarFactura,
    duplicarFactura,

    // Gestión de pagos
    registrarPago,
    anularFactura,

    // Búsquedas y filtros
    buscarFacturas,
    cargarFacturasVencidas,

    // Estadísticas y reportes
    cargarEstadisticas,

    // Documentos
    descargarPDF,
    verPDF,

    // Utilidades
    generarNumeroFactura,
    validarNumeroFactura,
    calcularTotales,

    // Gestión de filtros y paginación
    actualizarFiltros,
    limpiarFiltros,
    cambiarPagina,
    cambiarLimite,

    // Facturación automática
    generarFacturacionMensual,
    generarFacturaIndividual,

    // Gestión de mensajes
    clearError,
    clearSuccess,
    clearMessages,

    // Constantes útiles
    ESTADOS_FACTURA,
    METODOS_PAGO,

    // Información del usuario
    user,
    hasPermission
  };
};

// ==========================================
// HOOK ESPECIALIZADO PARA FORMULARIOS
// ==========================================

/**
 * Hook especializado para formularios de factura
 */
export const useFormularioFactura = (facturaInicial = null) => {
  const [datosFactura, setDatosFactura] = useState({
    cliente_id: '',
    numero_factura: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodo_facturacion: '',
    fecha_desde: '',
    fecha_hasta: '',
    internet: 0,
    television: 0,
    saldo_anterior: 0,
    interes: 0,
    reconexion: 0,
    descuento: 0,
    varios: 0,
    publicidad: 0,
    ruta: '',
    observaciones: '',
    ...facturaInicial
  });

  const [erroresValidacion, setErroresValidacion] = useState({});
  const [totalesCalculados, setTotalesCalculados] = useState({
    subtotal: 0,
    descuento: 0,
    base_gravable: 0,
    iva: 0,
    otros_cargos: 0,
    total: 0
  });

  /**
   * Actualizar campo específico del formulario
   */
  const actualizarCampo = useCallback((campo, valor) => {
    setDatosFactura(prev => ({
      ...prev,
      [campo]: valor
    }));

    // Limpiar error de validación para este campo
    if (erroresValidacion[campo]) {
      setErroresValidacion(prev => ({
        ...prev,
        [campo]: null
      }));
    }
  }, [erroresValidacion]);

  /**
   * Actualizar múltiples campos
   */
  const actualizarCampos = useCallback((nuevosDatos) => {
    setDatosFactura(prev => ({
      ...prev,
      ...nuevosDatos
    }));
  }, []);

  /**
   * Resetear formulario
   */
  const resetearFormulario = useCallback(() => {
    setDatosFactura({
      cliente_id: '',
      numero_factura: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      periodo_facturacion: '',
      fecha_desde: '',
      fecha_hasta: '',
      internet: 0,
      television: 0,
      saldo_anterior: 0,
      interes: 0,
      reconexion: 0,
      descuento: 0,
      varios: 0,
      publicidad: 0,
      ruta: '',
      observaciones: ''
    });
    setErroresValidacion({});
  }, []);

  /**
   * Validar formulario
   */
  const validarFormulario = useCallback(() => {
    const errores = {};

    if (!datosFactura.cliente_id) {
      errores.cliente_id = 'Cliente es requerido';
    }

    if (!datosFactura.fecha_emision) {
      errores.fecha_emision = 'Fecha de emisión es requerida';
    }

    if (!datosFactura.fecha_vencimiento) {
      errores.fecha_vencimiento = 'Fecha de vencimiento es requerida';
    }

    // Validar que fecha de vencimiento sea posterior a emisión
    if (datosFactura.fecha_emision && datosFactura.fecha_vencimiento) {
      const fechaEmision = new Date(datosFactura.fecha_emision);
      const fechaVencimiento = new Date(datosFactura.fecha_vencimiento);
      
      if (fechaVencimiento <= fechaEmision) {
        errores.fecha_vencimiento = 'Fecha de vencimiento debe ser posterior a emisión';
      }
    }

    // Validar valores numéricos
    const camposNumericos = ['internet', 'television', 'saldo_anterior', 'interes', 'reconexion', 'descuento', 'varios', 'publicidad'];
    camposNumericos.forEach(campo => {
      const valor = datosFactura[campo];
      if (valor !== undefined && (isNaN(valor) || valor < 0)) {
        errores[campo] = 'Debe ser un número válido mayor o igual a 0';
      }
    });

    setErroresValidacion(errores);
    return Object.keys(errores).length === 0;
  }, [datosFactura]);

  /**
   * Calcular totales automáticamente
   */
  useEffect(() => {
    const totales = facturacionManualService.calcularTotales(datosFactura);
    setTotalesCalculados(totales);
  }, [datosFactura]);

  return {
    datosFactura,
    erroresValidacion,
    totalesCalculados,
    actualizarCampo,
    actualizarCampos,
    resetearFormulario,
    validarFormulario,
    esValido: Object.keys(erroresValidacion).length === 0
  };
};

// Exports
export default useFacturacionManual;