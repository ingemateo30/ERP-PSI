// frontend/src/hooks/useFacturacionManual.js
// Hooks específicos para componentes en carpeta Facturas/
// Conecta con facturacionManualService.js y backend/routes/factura.js

import { useState, useCallback, useEffect, useMemo } from 'react';
import facturacionManualService, { ESTADOS_FACTURA, METODOS_PAGO } from '../services/facturacionManualService';
import { useAuth } from '../contexts/AuthContext';

// ==========================================
// HOOK PRINCIPAL PARA FacturasManagement.js
// ==========================================
export const useFacturas = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filtrosActivos, setFiltrosActivos] = useState({ page: 1, limit: 10 });

  // Memoizar filtros para evitar re-renders innecesarios
  const filtrosMemoizados = useMemo(() => filtrosActivos, [filtrosActivos]);

  // Función principal para cargar facturas - CONECTA CON facturacionManualService
  const cargarFacturas = useCallback(async (filtros = filtrosMemoizados) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [FacturasManagement] Cargando facturas con filtros:', filtros);
      
      // CONECTA: useFacturacionManual -> facturacionManualService -> backend/routes/factura.js
      const response = await facturacionManualService.obtenerFacturas(filtros);
      
      console.log('✅ [FacturasManagement] Respuesta del service:', response);
      
      // Manejar estructura de respuesta
      if (response?.facturas) {
        setFacturas(response.facturas);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else if (Array.isArray(response?.data)) {
        setFacturas(response.data);
      } else if (Array.isArray(response)) {
        setFacturas(response);
      } else {
        setFacturas([]);
      }
      
      // Actualizar filtros activos
      setFiltrosActivos(filtros);
      
    } catch (err) {
      console.error('❌ [FacturasManagement] Error cargando facturas:', err);
      let errorMessage = 'Error desconocido';
      
      if (err?.response) {
        switch (err.response.status) {
          case 401:
            errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
            break;
          case 404:
            errorMessage = 'Servicio de facturas no disponible.';
            break;
          case 500:
            errorMessage = 'Error interno del servidor.';
            break;
          default:
            errorMessage = err.response.data?.message || `Error del servidor: ${err.response.status}`;
        }
      } else if (err?.request) {
        errorMessage = 'No se pudo conectar con el servidor.';
      } else {
        errorMessage = err.message || 'Error desconocido';
      }
      
      setError(errorMessage);
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, [filtrosMemoizados]);

  // Cambiar página sin duplicar filtros
  const cambiarPagina = useCallback((nuevaPagina) => {
    const nuevosFiltros = { ...filtrosActivos, page: nuevaPagina };
    cargarFacturas(nuevosFiltros);
  }, [cargarFacturas, filtrosActivos]);

  // Aplicar filtros sin duplicar - PARA FacturasFilters.js
  const aplicarFiltros = useCallback((nuevosFiltros) => {
    const filtrosCombinados = { 
      ...filtrosActivos, 
      ...nuevosFiltros, 
      page: 1 // Resetear página al aplicar filtros
    };
    cargarFacturas(filtrosCombinados);
  }, [cargarFacturas, filtrosActivos]);

  // Limpiar filtros completamente
  const limpiarFiltros = useCallback(() => {
    const filtrosLimpios = { page: 1, limit: 10 };
    setFiltrosActivos(filtrosLimpios);
    cargarFacturas(filtrosLimpios);
  }, [cargarFacturas]);

  // Refrescar manteniendo filtros actuales
  const refrescar = useCallback(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  // Carga inicial solo una vez
  useEffect(() => {
    if (facturas.length === 0 && !loading && !error) {
      console.log('🚀 [FacturasManagement] Cargando facturas iniciales...');
      cargarFacturas();
    }
  }, []); // Solo al montar

  return {
    facturas,
    loading,
    error,
    pagination,
    filtros: filtrosActivos,
    cargarFacturas,
    cambiarPagina,
    aplicarFiltros,
    limpiarFiltros,
    refrescar
  };
};

// ==========================================
// HOOK PARA ACCIONES - FacturaModal.js, PagoModal.js, AnularModal.js
// ==========================================
export const useFacturasAcciones = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ejecutarAccion = useCallback(async (accion, nombreAccion = 'acción') => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 [FacturasAcciones] Ejecutando ${nombreAccion}...`);
      
      const resultado = await accion();
      console.log(`✅ [FacturasAcciones] ${nombreAccion} completada exitosamente`);
      return resultado;
    } catch (err) {
      console.error(`❌ [FacturasAcciones] Error en ${nombreAccion}:`, err);
      let errorMessage = `Error al ${nombreAccion}`;
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // CREAR FACTURA - Para FacturaModal.js
  const crearFactura = useCallback(async (datosFactura) => {
    return ejecutarAccion(
      () => facturacionManualService.crearFacturaManual(datosFactura),
      'crear factura'
    );
  }, [ejecutarAccion]);

  // ACTUALIZAR FACTURA - Para FacturaModal.js
  const actualizarFactura = useCallback(async (id, datosFactura) => {
    if (!id) throw new Error('ID de factura requerido para actualizar');
    return ejecutarAccion(
      () => facturacionManualService.actualizarFactura(id, datosFactura),
      'actualizar factura'
    );
  }, [ejecutarAccion]);

  // REGISTRAR PAGO - Para PagoModal.js
  const marcarComoPagada = useCallback(async (facturaId, datosPago = {}) => {
    if (!facturaId) throw new Error('ID de factura requerido para pago');
    
    // Valores por defecto para pago
    const datosCompletos = {
      valor_pagado: datosPago.valor_pagado || datosPago.monto || 0,
      metodo_pago: datosPago.metodo_pago || 'efectivo',
      fecha_pago: datosPago.fecha_pago || new Date().toISOString().split('T')[0],
      observaciones: datosPago.observaciones || '',
      ...datosPago
    };
    
    return ejecutarAccion(
      () => facturacionManualService.registrarPago(facturaId, datosCompletos),
      'registrar pago'
    );
  }, [ejecutarAccion]);

  // ANULAR FACTURA - Para AnularModal.js
  const anularFactura = useCallback(async (id, motivo = '') => {
    if (!id) throw new Error('ID de factura requerido para anular');
    return ejecutarAccion(
      () => facturacionManualService.anularFactura(id, motivo),
      'anular factura'
    );
  }, [ejecutarAccion]);

  // DUPLICAR FACTURA - Para FacturasList.js
  const duplicarFactura = useCallback(async (id) => {
    if (!id) throw new Error('ID de factura requerido para duplicar');
    return ejecutarAccion(
      () => facturacionManualService.duplicarFactura(id),
      'duplicar factura'
    );
  }, [ejecutarAccion]);

  // DESCARGAR PDF - Para FacturasList.js
  const descargarPDF = useCallback(async (facturaId) => {
    if (!facturaId) throw new Error('ID de factura requerido');
    return ejecutarAccion(
      () => facturacionManualService.generarPDF(facturaId, true),
      'descargar PDF'
    );
  }, [ejecutarAccion]);

  // VER PDF - Para FacturasList.js
  const verPDF = useCallback(async (facturaId) => {
    if (!facturaId) throw new Error('ID de factura requerido');
    try {
      await facturacionManualService.verPDF(facturaId);
    } catch (error) {
      console.error('Error visualizando PDF:', error);
      setError('Error al visualizar PDF');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    crearFactura,
    actualizarFactura,
    marcarComoPagada,
    anularFactura,
    duplicarFactura,
    descargarPDF,
    verPDF,
    clearError
  };
};

// ==========================================
// HOOK PARA ESTADÍSTICAS - FacturasStats.js
// ==========================================
export const useFacturasEstadisticas = () => {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarEstadisticas = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 [FacturasStats] Cargando estadísticas de facturas...');
      
      // CONECTA: FacturasStats -> facturacionManualService -> backend/routes/factura.js
      const response = await facturacionManualService.obtenerEstadisticas(params);
      
      if (response?.data) {
        setEstadisticas(response.data);
      } else if (response) {
        setEstadisticas(response);
      }
      
      console.log('✅ [FacturasStats] Estadísticas cargadas exitosamente');
    } catch (err) {
      console.error('❌ [FacturasStats] Error cargando estadísticas:', err);
      let errorMessage = 'Error al cargar estadísticas';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refrescar = useCallback(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  return {
    estadisticas,
    loading,
    error,
    cargarEstadisticas,
    refrescar
  };
};

// ==========================================
// HOOK PARA FORMULARIOS - FacturaModal.js
// ==========================================
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

  // Actualizar campo específico del formulario
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

  // Actualizar múltiples campos
  const actualizarCampos = useCallback((nuevosDatos) => {
    setDatosFactura(prev => ({
      ...prev,
      ...nuevosDatos
    }));
  }, []);

  // Resetear formulario
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

  // Validar formulario
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

  // Calcular totales automáticamente - USA facturacionManualService
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

// ==========================================
// HOOKS ADICIONALES PARA CASOS ESPECÍFICOS
// ==========================================

/**
 * Hook para búsquedas - FacturasFilters.js
 */
export const useFacturasBusqueda = () => {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buscar = useCallback(async (criterios) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [FacturasFilters] Buscando facturas con criterios:', criterios);
      
      const response = await facturacionManualService.buscarFacturas(criterios);
      
      if (response?.data) {
        setResultados(Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        setResultados(response);
      } else {
        setResultados([]);
      }
      
      console.log('✅ [FacturasFilters] Búsqueda completada');
    } catch (err) {
      console.error('❌ [FacturasFilters] Error en búsqueda:', err);
      setError(err.message || 'Error en búsqueda');
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const limpiarResultados = useCallback(() => {
    setResultados([]);
    setError(null);
  }, []);

  return {
    resultados,
    loading,
    error,
    buscar,
    limpiarResultados
  };
};

/**
 * Hook para facturas vencidas
 */
export const useFacturasVencidas = () => {
  const [facturasVencidas, setFacturasVencidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarVencidas = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('⏰ Cargando facturas vencidas...');
      
      const response = await facturacionManualService.obtenerFacturasVencidas(params);
      
      if (response?.data) {
        setFacturasVencidas(Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        setFacturasVencidas(response);
      } else {
        setFacturasVencidas([]);
      }
      
      console.log('✅ Facturas vencidas cargadas');
    } catch (err) {
      console.error('❌ Error cargando facturas vencidas:', err);
      setError(err.message || 'Error cargando facturas vencidas');
      setFacturasVencidas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refrescar = useCallback(() => {
    cargarVencidas();
  }, [cargarVencidas]);

  useEffect(() => {
    cargarVencidas();
  }, [cargarVencidas]);

  return {
    facturasVencidas,
    loading,
    error,
    cargarVencidas,
    refrescar
  };
};

/**
 * Hook para utilidades de facturación
 */
export const useFacturasUtilidades = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generarNumero = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const numero = await facturacionManualService.generarNumeroFactura();
      return numero;
    } catch (err) {
      console.error('❌ Error generando número:', err);
      setError(err.message || 'Error generando número de factura');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const validarNumero = useCallback(async (numero) => {
    try {
      const esValido = await facturacionManualService.validarNumeroFactura(numero);
      return esValido;
    } catch (err) {
      console.error('❌ Error validando número:', err);
      return false;
    }
  }, []);

  const calcularTotales = useCallback((datosFactura) => {
    return facturacionManualService.calcularTotales(datosFactura);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    generarNumero,
    validarNumero,
    calcularTotales,
    clearError
  };
};

// ==========================================
// EXPORTS PARA COMPONENTES FACTURAS
// ==========================================

// Exports principales que usan los componentes
export default useFacturas;

// Re-exports de constantes
export { ESTADOS_FACTURA, METODOS_PAGO } from '../services/facturacionManualService';