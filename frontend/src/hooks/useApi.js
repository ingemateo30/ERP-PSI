// frontend/src/hooks/useApi.js

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para manejar peticiones API con estados de carga, error y datos
 * @param {Function} apiFunction - Función que realiza la petición API
 * @param {*} initialData - Datos iniciales
 * @param {boolean} executeOnMount - Si ejecutar la función al montar el componente
 */
export const useApi = (apiFunction, initialData = null, executeOnMount = false) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiFunction(...args);
      
      // Extraer datos de la respuesta según la estructura del backend
      const responseData = result.data || result;
      setData(responseData);
      
      return responseData;
    } catch (err) {
      const errorMessage = err.message || 'Error desconocido';
      setError(errorMessage);
      console.error('Error en useApi:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  // Ejecutar en mount si se especifica
  useEffect(() => {
    if (executeOnMount) {
      execute();
    }
  }, [execute, executeOnMount]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
    setError
  };
};

/**
 * Hook para manejo de listas con paginación
 * @param {Function} apiFunction - Función que obtiene la lista
 * @param {Object} initialParams - Parámetros iniciales de búsqueda
 */
export const useApiList = (apiFunction, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    ...initialParams
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (newParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const finalParams = { ...params, ...newParams };
      const result = await apiFunction(finalParams);
      
      // Estructura esperada del backend: { data: items, pagination: {...} }
      if (result.data && Array.isArray(result.data)) {
        setData(result.data);
      } else if (Array.isArray(result)) {
        setData(result);
      } else if (result.data && Array.isArray(result.data.items)) {
        setData(result.data.items);
      }
      
      // Actualizar paginación si existe
      if (result.pagination) {
        setPagination(result.pagination);
      } else if (result.data && result.data.pagination) {
        setPagination(result.data.pagination);
      }
      
      setParams(finalParams);
      
    } catch (err) {
      const errorMessage = err.message || 'Error cargando datos';
      setError(errorMessage);
      console.error('Error en useApiList:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFunction, params]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, []);

  const refresh = useCallback(() => {
    fetchData(params);
  }, [fetchData, params]);

  const changePage = useCallback((page) => {
    fetchData({ ...params, page });
  }, [fetchData, params]);

  const changeLimit = useCallback((limit) => {
    fetchData({ ...params, limit, page: 1 });
  }, [fetchData, params]);

  const search = useCallback((searchParams) => {
    fetchData({ ...params, ...searchParams, page: 1 });
  }, [fetchData, params]);

  const reset = useCallback(() => {
    const resetParams = { page: 1, limit: 10, ...initialParams };
    fetchData(resetParams);
  }, [fetchData, initialParams]);

  return {
    data,
    pagination,
    params,
    loading,
    error,
    refresh,
    changePage,
    changeLimit,
    search,
    reset,
    setData
  };
};

/**
 * Hook para operaciones CRUD
 * @param {Object} service - Objeto con métodos del servicio (getAll, create, update, delete)
 */
export const useCrud = (service) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadItems = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await service.getAll(params);
      const data = result.data || result;
      
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error cargando elementos');
      console.error('Error en loadItems:', err);
    } finally {
      setLoading(false);
    }
  }, [service]);

  const createItem = useCallback(async (itemData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await service.create(itemData);
      const newItem = result.data || result;
      
      setItems(prev => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      setError(err.message || 'Error creando elemento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const updateItem = useCallback(async (id, itemData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await service.update(id, itemData);
      const updatedItem = result.data || result;
      
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      ));
      
      return updatedItem;
    } catch (err) {
      setError(err.message || 'Error actualizando elemento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const deleteItem = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      await service.delete(id);
      
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message || 'Error eliminando elemento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const getItem = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await service.getById(id);
      return result.data || result;
    } catch (err) {
      setError(err.message || 'Error obteniendo elemento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (service && service.getAll) {
      loadItems();
    }
  }, [loadItems, service]);

  return {
    items,
    loading,
    error,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    getItem,
    setItems,
    setError
  };
};

/**
 * Hook para manejar formularios con validación
 * @param {Object} initialValues - Valores iniciales del formulario
 * @param {Function} onSubmit - Función a ejecutar en submit
 * @param {Function} validate - Función de validación opcional
 */
export const useForm = (initialValues, onSubmit, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo si existe
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validar campo individual si existe función de validación
    if (validate && touched[name]) {
      const fieldErrors = validate(values);
      if (fieldErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
      }
    }
  }, [validate, values, touched]);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    // Validar formulario completo
    if (validate) {
      const validationErrors = validate(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }
    
    try {
      setLoading(true);
      setErrors({});
      await onSubmit(values);
    } catch (err) {
      if (err.validationErrors) {
        setErrors(err.validationErrors);
      } else {
        setErrors({ submit: err.message || 'Error en el formulario' });
      }
    } finally {
      setLoading(false);
    }
  }, [values, validate, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setLoading(false);
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  return {
    values,
    errors,
    loading,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    setValues,
    setErrors
  };
};

export default useApi;