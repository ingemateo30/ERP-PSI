// frontend/src/hooks/useClients.js

import { useState, useEffect, useCallback } from 'react';
import { clientService } from '../services/clientService';
import { PAGINATION_CONFIG, CLIENT_STATES } from '../constants/clientConstants';

/**
 * Hook principal para gestión de clientes
 */
export const useClients = () => {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: PAGINATION_CONFIG.DEFAULT_PAGE,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: PAGINATION_CONFIG.DEFAULT_LIMIT,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para cargar clientes
  const loadClients = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...filters,
        ...params
      };

      console.log('🔍 Cargando clientes con parámetros:', searchParams);

      const response = await clientService.getClients(searchParams);

      if (response.success) {
        setClients(response.data || []);
        setPagination(response.pagination || pagination);
        console.log('✅ Clientes cargados:', response.data?.length || 0);
      } else {
        setError(response.message || 'Error al cargar clientes');
        setClients([]);
      }

      return response;
    } catch (err) {
      console.error('❌ Error cargando clientes:', err);
      setError(err.message || 'Error de conexión');
      setClients([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

  // Cambiar página
  const changePage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, [pagination.totalPages]);

  // Cambiar límite de elementos por página
  const changeLimit = useCallback((newLimit) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: Math.min(newLimit, PAGINATION_CONFIG.MAX_LIMIT),
      currentPage: 1
    }));
  }, []);

  // Aplicar filtros
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Refrescar datos
  const refresh = useCallback(() => {
    return loadClients();
  }, [loadClients]);

  // Cargar datos cuando cambien las dependencias
  useEffect(() => {
    loadClients();
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

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
 * Hook para formularios de cliente
 */
export const useClientForm = (initialClient = null) => {
  const [formData, setFormData] = useState({
    tipo_documento: 'cedula',
    identificacion: '',
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
    estado: CLIENT_STATES.ACTIVO,
    mac_address: '',
    ip_asignada: '',
    tap: '',
    poste: '',
    contrato: '',
    ruta: '',
    requiere_reconexion: false,
    codigo_usuario: '',
    observaciones: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Inicializar formulario con datos del cliente si existe
  useEffect(() => {
    if (initialClient) {
      const clientData = {
        tipo_documento: initialClient.tipo_documento || 'cedula',
        identificacion: initialClient.identificacion || '',
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
        estado: initialClient.estado || CLIENT_STATES.ACTIVO,
        mac_address: initialClient.mac_address || '',
        ip_asignada: initialClient.ip_asignada || '',
        tap: initialClient.tap || '',
        poste: initialClient.poste || '',
        contrato: initialClient.contrato || '',
        ruta: initialClient.ruta || '',
        requiere_reconexion: initialClient.requiere_reconexion || false,
        codigo_usuario: initialClient.codigo_usuario || '',
        observaciones: initialClient.observaciones || ''
      };
      setFormData(clientData);
    }
  }, [initialClient]);

  // Actualizar campo del formulario
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Validar formulario
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Validaciones requeridas
    if (!formData.identificacion?.trim()) {
      newErrors.identificacion = 'La identificación es requerida';
    }

    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.direccion?.trim()) {
      newErrors.direccion = 'La dirección es requerida';
    }

    // Validaciones de formato
    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = 'El formato del correo electrónico es inválido';
    }

    if (formData.telefono && !/^\d{10}$/.test(formData.telefono.replace(/\D/g, ''))) {
      newErrors.telefono = 'El teléfono debe tener 10 dígitos';
    }

    if (formData.mac_address && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(formData.mac_address)) {
      newErrors.mac_address = 'Formato de MAC inválido (ejemplo: AA:BB:CC:DD:EE:FF)';
    }

    if (formData.ip_asignada && !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(formData.ip_asignada)) {
      newErrors.ip_asignada = 'Formato de IP inválido (ejemplo: 192.168.1.100)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Crear cliente
  const createClient = useCallback(async () => {
    if (!validateForm()) {
      throw new Error('Por favor corrige los errores en el formulario');
    }

    setLoading(true);
    try {
      const response = await clientService.createClient(formData);
      
      if (response.success) {
        console.log('✅ Cliente creado exitosamente:', response.data);
        return response;
      } else {
        throw new Error(response.message || 'Error al crear cliente');
      }
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm]);

  // Actualizar cliente
  const updateClient = useCallback(async (clientId) => {
    if (!validateForm()) {
      throw new Error('Por favor corrige los errores en el formulario');
    }

    if (!clientId) {
      throw new Error('ID de cliente requerido');
    }

    setLoading(true);
    try {
      const response = await clientService.updateClient(clientId, formData);
      
      if (response.success) {
        console.log('✅ Cliente actualizado exitosamente:', response.data);
        return response;
      } else {
        throw new Error(response.message || 'Error al actualizar cliente');
      }
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData({
      tipo_documento: 'cedula',
      identificacion: '',
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
      estado: CLIENT_STATES.ACTIVO,
      mac_address: '',
      ip_asignada: '',
      tap: '',
      poste: '',
      contrato: '',
      ruta: '',
      requiere_reconexion: false,
      codigo_usuario: '',
      observaciones: ''
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    loading,
    updateField,
    validateForm,
    createClient,
    updateClient,
    resetForm
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
    try {
      setLoading(true);
      setError(null);

      const response = await clientService.getClientStats();
      
      if (response.success) {
        setStats(response.data || stats);
      } else {
        setError(response.message || 'Error al cargar estadísticas');
      }
    } catch (err) {
      console.error('❌ Error cargando estadísticas:', err);
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

/**
 * Hook para búsqueda de clientes
 */
export const useClientSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (searchTerm, filters = {}) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await clientService.searchClients(searchTerm, filters);
      
      if (response.success) {
        setResults(response.data || []);
      } else {
        setError(response.message || 'Error en la búsqueda');
        setResults([]);
      }
    } catch (err) {
      console.error('❌ Error en búsqueda:', err);
      setError(err.message || 'Error de conexión');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults
  };
};

export default {
  useClients,
  useClientForm,
  useClientStats,
  useClientSearch
};