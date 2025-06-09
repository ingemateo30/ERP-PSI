// hooks/useFacturas.js - Versión corregida con manejo de errores
import { useState, useEffect, useCallback } from 'react';
import FacturasService from '../services/facturasService';

export const useFacturas = (filtrosIniciales = {}) => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [filtros, setFiltros] = useState({
    page: 1,
    limit: 10,
    ...filtrosIniciales
  });

  // Cargar facturas
  const cargarFacturas = useCallback(async (nuevosFiltros = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const filtrosCompletos = { ...filtros, ...nuevosFiltros };
      
      console.log('🔍 Cargando facturas con filtros:', filtrosCompletos);
      
      const response = await FacturasService.obtenerFacturas(filtrosCompletos);
      
      console.log('📦 Respuesta del servidor:', response);
      
      // Verificar estructura de respuesta
      if (!response) {
        throw new Error('No se recibió respuesta del servidor');
      }

      console.log('🔍 Estructura completa de respuesta:', response);

      // El problema: response ya contiene { facturas: [...], pagination: {...} }
      // No está envuelto en response.data cuando viene del backend
      
      let facturasData = [];
      let paginationData = pagination;

      // Verificar si viene directamente (no envuelto en .data)
      if (response.facturas) {
        console.log('✅ Estructura directa detectada');
        facturasData = response.facturas;
        paginationData = response.pagination || pagination;
      }
      // O si viene envuelto en .data 
      else if (response.data && response.data.facturas) {
        console.log('✅ Estructura con .data detectada');
        facturasData = response.data.facturas;
        paginationData = response.data.pagination || pagination;
      }
      // O si response.data es directamente un array
      else if (response.data && Array.isArray(response.data)) {
        console.log('✅ Array directo en .data detectado');
        facturasData = response.data;
        paginationData = { ...pagination, totalItems: response.data.length };
      }
      // O si response es directamente un array
      else if (Array.isArray(response)) {
        console.log('✅ Array directo detectado');
        facturasData = response;
        paginationData = { ...pagination, totalItems: response.length };
      }
      else {
        console.warn('⚠️ Estructura de respuesta no reconocida:', response);
        // No lanzar error, usar array vacío
        facturasData = [];
      }
      
      console.log('✅ Facturas procesadas:', facturasData.length);
      
      setFacturas(facturasData || []);
      setPagination(paginationData);
      setFiltros(filtrosCompletos);
      
    } catch (err) {
      console.error('❌ Error al cargar facturas:', err);
      
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al cargar facturas';
      
      if (err.response) {
        // Error de respuesta del servidor
        if (err.response.status === 401) {
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
        } else if (err.response.status === 404) {
          errorMessage = 'Endpoint de facturas no encontrado. Verifica que el backend esté configurado.';
        } else if (err.response.status === 500) {
          errorMessage = 'Error interno del servidor. Verifica que la base de datos esté funcionando.';
        } else {
          errorMessage = err.response.data?.message || `Error del servidor: ${err.response.status}`;
        }
      } else if (err.request) {
        // Error de red
        errorMessage = 'No se pudo conectar con el servidor. Verifica que esté ejecutándose.';
      } else {
        // Otros errores
        errorMessage = err.message || 'Error desconocido';
      }
      
      setError(errorMessage);
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, [filtros, pagination]);

  // Cambiar página
  const cambiarPagina = useCallback((nuevaPagina) => {
    cargarFacturas({ page: nuevaPagina });
  }, [cargarFacturas]);

  // Aplicar filtros
  const aplicarFiltros = useCallback((nuevosFiltros) => {
    cargarFacturas({ ...nuevosFiltros, page: 1 });
  }, [cargarFacturas]);

  // Limpiar filtros
  const limpiarFiltros = useCallback(() => {
    const filtrosLimpios = { page: 1, limit: 10 };
    setFiltros(filtrosLimpios);
    cargarFacturas(filtrosLimpios);
  }, [cargarFacturas]);

  // Refrescar datos
  const refrescar = useCallback(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  // Cargar al montar solo si no hay facturas
  useEffect(() => {
    if (facturas.length === 0 && !loading && !error) {
      console.log('🚀 Cargando facturas iniciales...');
      cargarFacturas();
    }
  }, []);

  return {
    facturas,
    loading,
    error,
    pagination,
    filtros,
    cargarFacturas,
    cambiarPagina,
    aplicarFiltros,
    limpiarFiltros,
    refrescar
  };
};

// Hook para estadísticas con manejo de errores mejorado
export const useFacturasEstadisticas = () => {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarEstadisticas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Cargando estadísticas de facturas...');
      
      const response = await FacturasService.obtenerEstadisticas();
      
      console.log('📈 Respuesta estadísticas:', response);
      
      if (response && response.data) {
        setEstadisticas(response.data);
      } else {
        // Si no hay datos, usar valores por defecto
        setEstadisticas({
          total: 0,
          pendientes: 0,
          pagadas: 0,
          vencidas: 0,
          anuladas: 0,
          valor_pendiente: 0,
          valor_pagado: 0,
          cartera_vencida: 0,
          facturadas_hoy: 0,
          facturado_mes_actual: 0
        });
      }
    } catch (err) {
      console.error('❌ Error al cargar estadísticas:', err);
      
      // Usar estadísticas vacías en caso de error
      setEstadisticas({
        total: 0,
        pendientes: 0,
        pagadas: 0,
        vencidas: 0,
        anuladas: 0,
        valor_pendiente: 0,
        valor_pagado: 0,
        cartera_vencida: 0,
        facturadas_hoy: 0,
        facturado_mes_actual: 0
      });
      
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  return {
    estadisticas,
    loading,
    error,
    refrescar: cargarEstadisticas
  };
};

// Resto de hooks sin cambios...
export const useFactura = (id) => {
  const [factura, setFactura] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarFactura = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await FacturasService.obtenerFacturaPorId(id);
      
      if (response && response.data) {
        setFactura(response.data.factura);
        setDetalles(response.data.detalles || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar factura');
      console.error('Error al cargar factura:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarFactura();
  }, [cargarFactura]);

  return {
    factura,
    detalles,
    loading,
    error,
    refrescar: cargarFactura
  };
};

export const useFacturasAcciones = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ejecutarAccion = useCallback(async (accion) => {
    try {
      setLoading(true);
      setError(null);
      
      const resultado = await accion();
      return resultado;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al ejecutar acción';
      setError(errorMessage);
      console.error('Error en acción:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const crearFactura = useCallback(async (datos) => {
    return ejecutarAccion(() => FacturasService.crearFactura(datos));
  }, [ejecutarAccion]);

  const actualizarFactura = useCallback(async (id, datos) => {
    return ejecutarAccion(() => FacturasService.actualizarFactura(id, datos));
  }, [ejecutarAccion]);

  const marcarComoPagada = useCallback(async (id, datosPago) => {
    return ejecutarAccion(() => FacturasService.marcarComoPagada(id, datosPago));
  }, [ejecutarAccion]);

  const anularFactura = useCallback(async (id, motivo) => {
    return ejecutarAccion(() => FacturasService.anularFactura(id, motivo));
  }, [ejecutarAccion]);

  const duplicarFactura = useCallback(async (id, datos = {}) => {
    return ejecutarAccion(() => FacturasService.duplicarFactura(id, datos));
  }, [ejecutarAccion]);

  const descargarPDF = useCallback(async (id, nombreCliente) => {
    return ejecutarAccion(() => FacturasService.descargarPDF(id, nombreCliente));
  }, [ejecutarAccion]);

  const verPDF = useCallback(async (id) => {
    return ejecutarAccion(() => FacturasService.verPDF(id));
  }, [ejecutarAccion]);

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
    clearError: () => setError(null)
  };
};