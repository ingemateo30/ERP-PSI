import { useState, useEffect, useCallback } from 'react';
import { clientService } from '../services/clientService';
import { PAGINATION_CONFIG } from '../constants/clientConstants';

export const useClients = (initialFilters = {}) => {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: PAGINATION_CONFIG.DEFAULT_PAGE,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: PAGINATION_CONFIG.DEFAULT_LIMIT
  });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar clientes
  const loadClients = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...filters,
        ...params
      };

      const response = await clientService.getClients(queryParams);
      
      if (response.success) {
        setClients(response.data);
        setPagination(prev => ({
          ...prev,
          ...response.pagination
        }));
      } else {
        setError(response.message);
        setClients([]);
      }
    } catch (err) {
      setError('Error al cargar clientes');
      setClients([]);
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

  // Cambiar página
  const changePage = useCallback((newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  }, []);

  // Cambiar límite por página
  const changeLimit = useCallback((newLimit) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newLimit,
      currentPage: 1 // Reset a primera página
    }));
  }, []);

  // Aplicar filtros
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({
      ...prev,
      currentPage: 1 // Reset a primera página
    }));
  }, []);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  }, []);

  // Refrescar datos
  const refresh = useCallback(() => {
    loadClients();
  }, [loadClients]);

  // Cargar datos cuando cambien las dependencias
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return {
    clients,
    setClients,
    pagination,
    filters,
    loading,
    error,
    loadClients,
    changePage,
    changeLimit,
    applyFilters,
    clearFilters,
    refresh
  };
};

export const useClientForm = (initialData = null) => {
  const [formData, setFormData] = useState(initialData || {
    identificacion: '',
    tipo_documento: 'cedula',
    nombre: '',
    direccion: '',
    telefono: '',
    telefono_2: '',
    correo: '',
    sector_id: '',
    ciudad_id: '',
    barrio: '',
    estrato: '',
    estado: 'activo',
    mac_address: '',
    ip_asignada: '',
    tap: '',
    poste: '',
    contrato: '',
    ruta: '',
    codigo_usuario: '',
    observaciones: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Actualizar campo del formulario
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando se modifica
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
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
      newErrors.correo = 'Formato de email inválido';
    }

    if (formData.telefono && !/^[0-9]{7,10}$/.test(formData.telefono.replace(/\D/g, ''))) {
      newErrors.telefono = 'Formato de teléfono inválido';
    }

    if (formData.mac_address && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(formData.mac_address)) {
      newErrors.mac_address = 'Formato de MAC inválido';
    }

    if (formData.ip_asignada && !/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.ip_asignada)) {
      newErrors.ip_asignada = 'Formato de IP inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData(initialData || {
      identificacion: '',
      tipo_documento: 'cedula',
      nombre: '',
      direccion: '',
      telefono: '',
      telefono_2: '',
      correo: '',
      sector_id: '',
      ciudad_id: '',
      barrio: '',
      estrato: '',
      estado: 'activo',
      mac_address: '',
      ip_asignada: '',
      tap: '',
      poste: '',
      contrato: '',
      ruta: '',
      codigo_usuario: '',
      observaciones: ''
    });
    setErrors({});
  }, [initialData]);

  // Crear cliente
  const createClient = useCallback(async () => {
    if (!validateForm()) {
      return { success: false, message: 'Por favor corrije los errores' };
    }

    setLoading(true);
    try {
      const response = await clientService.createClient(formData);
      if (response.success) {
        resetForm();
      } else {
        if (response.errors) {
          const errorObj = {};
          response.errors.forEach(error => {
            errorObj[error.campo] = error.mensaje;
          });
          setErrors(errorObj);
        }
      }
      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear cliente'
      };
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, resetForm]);

  // Actualizar cliente
  const updateClient = useCallback(async (id) => {
    if (!validateForm()) {
      return { success: false, message: 'Por favor corrije los errores' };
    }

    setLoading(true);
    try {
      const response = await clientService.updateClient(id, formData);
      if (!response.success && response.errors) {
        const errorObj = {};
        response.errors.forEach(error => {
          errorObj[error.campo] = error.mensaje;
        });
        setErrors(errorObj);
      }
      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar cliente'
      };
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm]);

  return {
    formData,
    setFormData,
    errors,
    loading,
    updateField,
    validateForm,
    resetForm,
    createClient,
    updateClient
  };
};

export default useClients;