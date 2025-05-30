// frontend/src/hooks/useApi.js - Hook personalizado para API

import { useState, useCallback } from 'react';

// Hook básico para llamadas a API
export const useApi = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      if (typeof apiFunction === 'function') {
        result = await apiFunction(...args);
      } else if (typeof args[0] === 'function') {
        // Si se pasa la función como primer argumento
        result = await args[0]();
      } else {
        throw new Error('No se proporcionó función API válida');
      }
      
      if (result.success) {
        setData(result.data);
        return result;
      } else {
        setError(result.message || 'Error desconocido');
        return result;
      }
    } catch (err) {
      console.error('Error en useApi:', err);
      setError(err.message || 'Error de conexión');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
};

// Hook para listas con paginación
export const useApiList = (apiFunction, autoLoad = true) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});

  const loadData = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const searchParams = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...filters,
        ...params
      };

      // Filtrar parámetros vacíos
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] === '' || searchParams[key] === null || searchParams[key] === undefined) {
          delete searchParams[key];
        }
      });

      console.log('🔍 Cargando datos con parámetros:', searchParams);
      const result = await apiFunction(searchParams);
      
      if (result.success && result.data) {
        setData(result.data.users || result.data.items || result.data || []);
        setPagination(result.data.pagination || pagination);
        return result;
      } else {
        setError(result.message || 'Error cargando datos');
        setData([]);
        return result;
      }
    } catch (err) {
      console.error('Error en useApiList:', err);
      setError(err.message || 'Error de conexión');
      setData([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, pagination.currentPage, pagination.itemsPerPage, filters]);

  const search = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const changePage = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  }, []);

  const changeLimit = useCallback((newLimit) => {
    setPagination(prev => ({ 
      ...prev, 
      itemsPerPage: newLimit, 
      currentPage: 1 
    }));
  }, []);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const reset = useCallback(() => {
    setData([]);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPrevPage: false
    });
    setFilters({});
    setError(null);
  }, []);

  return {
    data,
    pagination,
    loading,
    error,
    search,
    changePage,
    changeLimit,
    refresh,
    reset,
    loadData
  };
};

export default useApi;