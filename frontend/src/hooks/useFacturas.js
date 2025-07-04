// hooks/useFacturas.js - Versión corregida sin duplicados de filtros
import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Estados de filtros con memo para evitar duplicados
  const [filtrosActivos, setFiltrosActivos] = useState(() => ({
    page: 1,
    limit: 10,
    ...filtrosIniciales
  }));

  // Memoizar filtros para evitar re-renders innecesarios
  const filtrosMemoizados = useMemo(() => filtrosActivos, [JSON.stringify(filtrosActivos)]);

  // Cargar facturas con debounce mejorado
  const cargarFacturas = useCallback(async (nuevosFiltros = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Combinar filtros sin duplicar
      const filtrosFinales = {
        ...filtrosMemoizados,
        ...nuevosFiltros
      };

      // Eliminar filtros vacíos para evitar duplicados en la consulta
      const filtrosLimpios = Object.fromEntries(
        Object.entries(filtrosFinales).filter(([key, value]) => 
          value !== '' && value !== null && value !== undefined
        )
      );
      
      console.log('🔍 Cargando facturas con filtros limpios:', filtrosLimpios);
      
      const response = await FacturasService.obtenerFacturas(filtrosLimpios);
      
      if (!response) {
        throw new Error('No se recibió respuesta del servidor');
      }

      // Procesar respuesta de manera consistente
      let facturasData = [];
      let paginationData = pagination;

      if (response.success && response.data) {
        if (response.data.facturas) {
          facturasData = response.data.facturas;
          paginationData = response.data.pagination || pagination;
        } else if (Array.isArray(response.data)) {
          facturasData = response.data;
        }
      } else if (response.facturas) {
        facturasData = response.facturas;
        paginationData = response.pagination || pagination;
      } else if (Array.isArray(response)) {
        facturasData = response;
      }
      
      setFacturas(facturasData || []);
      setPagination(paginationData);
      setFiltrosActivos(filtrosFinales);
      
    } catch (err) {
      console.error('❌ Error al cargar facturas:', err);
      
      let errorMessage = 'Error al cargar facturas';
      
      if (err.response) {
        switch (err.response.status) {
          case 401:
            errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
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
      } else if (err.request) {
        errorMessage = 'No se pudo conectar con el servidor.';
      } else {
        errorMessage = err.message || 'Error desconocido';
      }
      
      setError(errorMessage);
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, [filtrosMemoizados, pagination]);

  // Cambiar página sin duplicar filtros
  const cambiarPagina = useCallback((nuevaPagina) => {
    const nuevosFiltros = { ...filtrosActivos, page: nuevaPagina };
    cargarFacturas(nuevosFiltros);
  }, [cargarFacturas, filtrosActivos]);

  // Aplicar filtros sin duplicar
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
      console.log('🚀 Cargando facturas iniciales...');
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

// Hook para acciones corregido
export const useFacturasAcciones = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ejecutarAccion = useCallback(async (accion, nombreAccion = 'acción') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Ejecutando ${nombreAccion}...`);
      const resultado = await accion();
      console.log(`✅ ${nombreAccion} ejecutada exitosamente`);
      
      return resultado;
    } catch (err) {
      console.error(`❌ Error en ${nombreAccion}:`, err);
      
      let errorMessage = `Error al ejecutar ${nombreAccion}`;
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearFactura = useCallback(async (datos) => {
    return ejecutarAccion(() => FacturasService.crearFactura(datos), 'crear factura');
  }, [ejecutarAccion]);

  const actualizarFactura = useCallback(async (id, datos) => {
    if (!id) throw new Error('ID de factura requerido para actualizar');
    return ejecutarAccion(() => FacturasService.actualizarFactura(id, datos), 'actualizar factura');
  }, [ejecutarAccion]);

  const marcarComoPagada = useCallback(async (id, datosPago) => {
    if (!id) throw new Error('ID de factura requerido');
    if (!datosPago?.metodo_pago) throw new Error('Método de pago requerido');
    
    return ejecutarAccion(() => FacturasService.marcarComoPagada(id, datosPago), 'marcar como pagada');
  }, [ejecutarAccion]);

  const anularFactura = useCallback(async (id, motivo) => {
    if (!id) throw new Error('ID de factura requerido');
    if (!motivo || motivo.trim().length < 10) {
      throw new Error('Motivo de anulación debe tener al menos 10 caracteres');
    }
    
    return ejecutarAccion(() => FacturasService.anularFactura(id, motivo), 'anular factura');
  }, [ejecutarAccion]);

  const duplicarFactura = useCallback(async (id, datos = {}) => {
    if (!id) throw new Error('ID de factura requerido para duplicar');
    return ejecutarAccion(() => FacturasService.duplicarFactura(id, datos), 'duplicar factura');
  }, [ejecutarAccion]);

  const descargarPDF = useCallback(async (id, nombreCliente = 'factura') => {
    if (!id) throw new Error('ID de factura requerido para descargar PDF');
    return ejecutarAccion(() => FacturasService.descargarPDF(id, nombreCliente), 'descargar PDF');
  }, [ejecutarAccion]);

  const verPDF = useCallback(async (id) => {
    if (!id) throw new Error('ID de factura requerido para ver PDF');
    return ejecutarAccion(() => FacturasService.verPDF(id), 'ver PDF');
  }, [ejecutarAccion]);

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

// Hook para estadísticas mejorado
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
      
      if (response?.data) {
        setEstadisticas(response.data);
      } else if (response) {
        setEstadisticas(response);
      } else {
        setEstadisticas({
          total: 0,
          pendientes: 0,
          pagadas: 0,
          vencidas: 0,
          anuladas: 0,
          total_valor: 0
        });
      }
      
    } catch (err) {
      console.error('❌ Error al cargar estadísticas:', err);
      setError('Error al cargar estadísticas');
      setEstadisticas(null);
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