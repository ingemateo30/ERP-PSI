// frontend/src/hooks/useClients.js - VERSIÓN CON DEBUG Y VALIDACIÓN MEJORADA

import { useState, useEffect, useCallback } from 'react';
import { clientService } from '../services/clientService';

/**
 * Hook principal para gestión de clientes
 */
export const useClients = (initialFilters = {}) => {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(process.env.NODE_ENV === 'development');

  // Función de debug
  const logDebug = (message, data) => {
    if (debugMode) {
      console.log(`🧑‍💼 useClients: ${message}`, data);
    }
  };

  // Cargar clientes
  const loadClients = useCallback(async (customFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchParams = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...filters,
        ...customFilters
      };

      // Limpiar parámetros vacíos
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] === '' || searchParams[key] === null || searchParams[key] === undefined) {
          delete searchParams[key];
        }
      });

      logDebug('Cargando clientes con parámetros', searchParams);

      const response = await clientService.getClients(searchParams);
      
      logDebug('Respuesta del servicio', response);

      if (response.success) {
        setClients(response.data || []);
        setPagination(response.pagination || pagination);
        logDebug('Clientes cargados exitosamente', {
          count: response.data?.length || 0,
          pagination: response.pagination
        });
      } else {
        setError(response.message || 'Error cargando clientes');
        setClients([]);
      }
    } catch (err) {
      logDebug('Error cargando clientes', err);
      setError(err.message || 'Error de conexión');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.itemsPerPage, debugMode]);

  // Cambiar página
  const changePage = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  }, []);

  // Cambiar límite por página
  const changeLimit = useCallback((newLimit) => {
    setPagination(prev => ({ 
      ...prev, 
      itemsPerPage: newLimit, 
      currentPage: 1 
    }));
  }, []);

  // Aplicar filtros
  const applyFilters = useCallback((newFilters) => {
    logDebug('Aplicando nuevos filtros', newFilters);
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [debugMode]);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    logDebug('Limpiando filtros');
    setFilters({});
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [debugMode]);

  // Refrescar datos
  const refresh = useCallback(() => {
    logDebug('Refrescando datos');
    loadClients();
  }, [loadClients, debugMode]);

  // Efecto para cargar clientes cuando cambien filtros o paginación
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return {
    clients,
    pagination,
    filters,
    loading,
    error,
    changePage,
    changeLimit,
    applyFilters,
    clearFilters,
    refresh,
    loadClients
  };
};

/**
 * Hook para formulario de cliente con validación mejorada
 */
export const useClientForm = (initialClient = null) => {
  const isEditing = Boolean(initialClient);
  const [debugMode, setDebugMode] = useState(process.env.NODE_ENV === 'development');

  // Estado inicial del formulario
  const getInitialFormData = () => {
    if (initialClient) {
      return {
        identificacion: initialClient.identificacion || '',
        tipo_documento: initialClient.tipo_documento || 'cedula',
        nombre: initialClient.nombre || '',
        direccion: initialClient.direccion || '',
        sector_id: initialClient.sector_id || '',
        estrato: initialClient.estrato || '',
        barrio: initialClient.barrio || '',
        ciudad_id: initialClient.ciudad_id || '',
        telefono: initialClient.telefono || '',
        telefono_2: initialClient.telefono_2 || '',
        correo: initialClient.correo || '',
        fecha_registro: initialClient.fecha_registro || new Date().toISOString().split('T')[0],
        fecha_hasta: initialClient.fecha_hasta || '',
        estado: initialClient.estado || 'activo',
        mac_address: initialClient.mac_address || '',
        ip_asignada: initialClient.ip_asignada || '',
        tap: initialClient.tap || '',
        poste: initialClient.poste || '',
        contrato: initialClient.contrato || '',
        ruta: initialClient.ruta || '',
        requiere_reconexion: Boolean(initialClient.requiere_reconexion),
        codigo_usuario: initialClient.codigo_usuario || '',
        observaciones: initialClient.observaciones || ''
      };
    }
    
    return {
      identificacion: '',
      tipo_documento: 'cedula',
      nombre: '',
      direccion: '',
      sector_id: '',
      estrato: '',
      barrio: '',
      ciudad_id: '',
      telefono: '',
      telefono_2: '',
      correo: '',
      fecha_registro: new Date().toISOString().split('T')[0],
      fecha_hasta: '',
      estado: 'activo',
      mac_address: '',
      ip_asignada: '',
      tap: '',
      poste: '',
      contrato: '',
      ruta: '',
      requiere_reconexion: false,
      codigo_usuario: '',
      observaciones: ''
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Función de debug
  const logDebug = (message, data) => {
    if (debugMode) {
      console.log(`📝 useClientForm: ${message}`, data);
    }
  };

  // Actualizar campo del formulario
  const updateField = useCallback((field, value) => {
    logDebug(`Actualizando campo ${field}`, { field, value, type: typeof value });
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors, debugMode]);

  // Validar formulario
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Validaciones básicas
    if (!formData.identificacion || formData.identificacion.trim().length < 5) {
      newErrors.identificacion = 'La identificación debe tener al menos 5 caracteres';
    }

    if (!formData.nombre || formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.direccion || formData.direccion.trim().length < 5) {
      newErrors.direccion = 'La dirección debe tener al menos 5 caracteres';
    }

    // Validar email si está presente
    if (formData.correo && formData.correo.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.correo.trim())) {
        newErrors.correo = 'El formato del correo electrónico no es válido';
      }
    }

    // Validar teléfonos si están presentes
    if (formData.telefono && formData.telefono.trim()) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(formData.telefono.trim()) || formData.telefono.trim().length < 7) {
        newErrors.telefono = 'El teléfono debe tener al menos 7 dígitos';
      }
    }

    if (formData.telefono_2 && formData.telefono_2.trim()) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(formData.telefono_2.trim()) || formData.telefono_2.trim().length < 7) {
        newErrors.telefono_2 = 'El teléfono secundario debe tener al menos 7 dígitos';
      }
    }

    // Validar MAC address si está presente
    if (formData.mac_address && formData.mac_address.trim()) {
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macRegex.test(formData.mac_address.trim())) {
        newErrors.mac_address = 'El formato de la dirección MAC no es válido (AA:BB:CC:DD:EE:FF)';
      }
    }

    // Validar IP si está presente
    if (formData.ip_asignada && formData.ip_asignada.trim()) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ip_asignada.trim())) {
        newErrors.ip_asignada = 'El formato de la IP no es válido';
      }
    }

    setErrors(newErrors);
    
    logDebug('Validación de formulario', {
      hasErrors: Object.keys(newErrors).length > 0,
      errors: newErrors,
      formData
    });

    return Object.keys(newErrors).length === 0;
  }, [formData, debugMode]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    logDebug('Reseteando formulario');
    setFormData(getInitialFormData());
    setErrors({});
  }, []);

  // Preparar datos para envío - FUNCIÓN CRÍTICA CORREGIDA
  const prepareDataForSubmission = useCallback((data) => {
    const cleanData = {};
    
    logDebug('Preparando datos para envío', { originalData: data });

    // Solo incluir campos que no estén vacíos
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      // Excluir valores vacíos y null/undefined
      if (value === null || value === undefined || value === '') {
        return;
      }

      // Conversiones específicas
      if (key === 'sector_id' || key === 'ciudad_id') {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue > 0) {
          cleanData[key] = numValue;
        }
      } else if (key === 'requiere_reconexion') {
        cleanData[key] = Boolean(value);
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          cleanData[key] = trimmed;
        }
      } else {
        cleanData[key] = value;
      }
    });

    // Asegurar campos requeridos con valores por defecto
    if (!cleanData.tipo_documento) {
      cleanData.tipo_documento = 'cedula';
    }
    
    if (!cleanData.estado) {
      cleanData.estado = 'activo';
    }
    
    if (!cleanData.fecha_registro) {
      cleanData.fecha_registro = new Date().toISOString().split('T')[0];
    }

    logDebug('Datos preparados para envío', cleanData);

    return cleanData;
  }, [debugMode]);

  // Crear cliente
  const createClient = useCallback(async (clientData) => {
    setLoading(true);
    try {
      logDebug('Creando cliente', clientData);
      
      const preparedData = prepareDataForSubmission(clientData || formData);
      const response = await clientService.createClient(preparedData);
      
      logDebug('Respuesta crear cliente', response);

      if (response.success) {
        resetForm();
        return response;
      } else {
        logDebug('Error en respuesta crear cliente', response);
        throw new Error(response.message || 'Error creando cliente');
      }
    } catch (error) {
      logDebug('❌ Error creando cliente', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [formData, prepareDataForSubmission, resetForm, debugMode]);

  // Actualizar cliente
  const updateClient = useCallback(async (clientId, clientData) => {
    setLoading(true);
    try {
      logDebug('Actualizando cliente', { clientId, clientData });
      
      const preparedData = prepareDataForSubmission(clientData || formData);
      
      logDebug('Datos preparados para actualización', preparedData);
      
      const response = await clientService.updateClient(clientId, preparedData);
      
      logDebug('Respuesta actualizar cliente', response);

      if (response.success) {
        return response;
      } else {
        logDebug('Error en respuesta actualizar cliente', response);
        throw new Error(response.message || 'Error actualizando cliente');
      }
    } catch (error) {
      logDebug('❌ Error actualizando cliente', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [formData, prepareDataForSubmission, debugMode]);

  // Efecto para actualizar formulario cuando cambie el cliente inicial
  useEffect(() => {
    if (initialClient) {
      logDebug('Cliente inicial cambiado, actualizando formulario', initialClient);
      setFormData(getInitialFormData());
      setErrors({});
    }
  }, [initialClient]);

  return {
    formData,
    errors,
    loading,
    isEditing,
    updateField,
    validateForm,
    resetForm,
    createClient,
    updateClient,
    prepareDataForSubmission
  };
};

/**
 * Hook para estadísticas de clientes
 */
export const useClientStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    suspendidos: 0,
    cortados: 0,
    retirados: 0,
    inactivos: 0,
    nuevos_hoy: 0,
    nuevos_semana: 0,
    nuevos_mes: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await clientService.getClientStats();
      
      if (response.success) {
        setStats(response.data || {});
      } else {
        setError(response.message || 'Error cargando estadísticas');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  };
};

export default useClients;