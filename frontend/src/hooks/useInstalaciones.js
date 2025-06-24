// frontend/src/hooks/useInstalaciones.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { instalacionesService } from '../services/instalacionesService';
import { useAuth } from '../contexts/AuthContext';
import { 
  PAGINATION_CONFIG, 
  ROLE_PERMISSIONS, 
  AUTO_REFRESH_CONFIG,
  ERROR_MESSAGES 
} from '../constants/instalacionesConstants';

export const useInstalaciones = (initialFilters = {}) => {
  // Estados principales
  const [instalaciones, setInstalaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de paginación
  const [pagination, setPagination] = useState({
    paginaActual: PAGINATION_CONFIG.DEFAULT_PAGE,
    totalPaginas: 1,
    limite: PAGINATION_CONFIG.DEFAULT_LIMIT,
    total: 0
  });

  // Estados de filtros
  const [filters, setFilters] = useState({
    ...initialFilters
  });

  // Estados de estadísticas
  const [estadisticas, setEstadisticas] = useState(null);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(false);

  // Auto refresh
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(AUTO_REFRESH_CONFIG.ENABLED);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(AUTO_REFRESH_CONFIG.INTERVAL_MS);

  // Contexto de autenticación
  const { user } = useAuth();

  // Permisos del usuario actual
  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[user?.rol] || ROLE_PERMISSIONS.instalador;
  }, [user?.rol]);

  // Función para cargar instalaciones
  const loadInstalaciones = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const params = {
        pagina: pagination.paginaActual,
        limite: pagination.limite,
        ...filters
      };

      console.log('🔄 Cargando instalaciones con parámetros:', params);

      const response = await instalacionesService.getInstalaciones(params);

      if (response.success) {
        setInstalaciones(response.instalaciones || []);
        setPagination(prev => ({
          ...prev,
          paginaActual: response.paginacion?.paginaActual || prev.paginaActual,
          totalPaginas: response.paginacion?.totalPaginas || 1,
          total: response.paginacion?.total || 0
        }));
        console.log('✅ Instalaciones cargadas:', response.instalaciones?.length);
      } else {
        throw new Error(response.message || ERROR_MESSAGES.GENERIC);
      }
    } catch (error) {
      console.error('❌ Error cargando instalaciones:', error);
      setError(error.message || ERROR_MESSAGES.NETWORK);
      setInstalaciones([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.paginaActual, pagination.limite, filters]);

  // Función para cargar estadísticas
  const loadEstadisticas = useCallback(async (filtrosEstadisticas = {}) => {
    try {
      setLoadingEstadisticas(true);
      
      const response = await instalacionesService.getEstadisticas(filtrosEstadisticas);
      
      if (response.success) {
        setEstadisticas(response.estadisticas);
        console.log('✅ Estadísticas cargadas:', response.estadisticas);
      } else {
        throw new Error(response.message || 'Error cargando estadísticas');
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
      setEstadisticas(null);
    } finally {
      setLoadingEstadisticas(false);
    }
  }, []);

  // Función para cambiar página
  const changePage = useCallback((nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= pagination.totalPaginas) {
      setPagination(prev => ({
        ...prev,
        paginaActual: nuevaPagina
      }));
    }
  }, [pagination.totalPaginas]);

  // Función para cambiar límite
  const changeLimit = useCallback((nuevoLimite) => {
    setPagination(prev => ({
      ...prev,
      limite: nuevoLimite,
      paginaActual: 1 // Resetear a primera página
    }));
  }, []);

  // Función para aplicar filtros
  const applyFilters = useCallback((nuevosFiltros) => {
    console.log('🔍 Aplicando filtros:', nuevosFiltros);
    setFilters(nuevosFiltros);
    setPagination(prev => ({
      ...prev,
      paginaActual: 1 // Resetear a primera página cuando se aplican filtros
    }));
  }, []);

  // Función para limpiar filtros
  const clearFilters = useCallback(() => {
    console.log('🧹 Limpiando filtros');
    setFilters({});
    setPagination(prev => ({
      ...prev,
      paginaActual: 1
    }));
  }, []);

  // Función para refrescar datos
  const refresh = useCallback(() => {
    console.log('🔄 Refrescando datos de instalaciones');
    setRefreshing(true);
    loadInstalaciones(false);
  }, [loadInstalaciones]);

  // Función para crear instalación
  const createInstalacion = useCallback(async (datosInstalacion) => {
    try {
      setLoading(true);
      setError(null);

      const response = await instalacionesService.createInstalacion(datosInstalacion);

      if (response.success) {
        console.log('✅ Instalación creada:', response.instalacion);
        await loadInstalaciones(false); // Recargar lista
        return response;
      } else {
        throw new Error(response.message || 'Error creando instalación');
      }
    } catch (error) {
      console.error('❌ Error creando instalación:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadInstalaciones]);

  // Función para actualizar instalación
  const updateInstalacion = useCallback(async (id, datosActualizacion) => {
    try {
      setLoading(true);
      setError(null);

      const response = await instalacionesService.updateInstalacion(id, datosActualizacion);

      if (response.success) {
        console.log('✅ Instalación actualizada:', response.instalacion);
        
        // Actualizar en la lista local
        setInstalaciones(prev => 
          prev.map(instalacion => 
            instalacion.id === id ? { ...instalacion, ...response.instalacion } : instalacion
          )
        );
        
        return response;
      } else {
        throw new Error(response.message || 'Error actualizando instalación');
      }
    } catch (error) {
      console.error('❌ Error actualizando instalación:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para cambiar estado
  const cambiarEstado = useCallback(async (id, estado, datos = {}) => {
    try {
      setError(null);

      const response = await instalacionesService.cambiarEstado(id, estado, datos);

      if (response.success) {
        console.log('✅ Estado cambiado:', response.instalacion);
        
        // Actualizar en la lista local
        setInstalaciones(prev => 
          prev.map(instalacion => 
            instalacion.id === id ? { ...instalacion, ...response.instalacion } : instalacion
          )
        );
        
        return response;
      } else {
        throw new Error(response.message || 'Error cambiando estado');
      }
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Función para reagendar
  const reagendarInstalacion = useCallback(async (id, nuevaFecha, motivo = '') => {
    try {
      setError(null);

      const response = await instalacionesService.reagendarInstalacion(id, nuevaFecha, motivo);

      if (response.success) {
        console.log('✅ Instalación reagendada:', response.instalacion);
        
        // Actualizar en la lista local
        setInstalaciones(prev => 
          prev.map(instalacion => 
            instalacion.id === id ? { ...instalacion, ...response.instalacion } : instalacion
          )
        );
        
        return response;
      } else {
        throw new Error(response.message || 'Error reagendando instalación');
      }
    } catch (error) {
      console.error('❌ Error reagendando instalación:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Función para asignar instalador
  const asignarInstalador = useCallback(async (id, instaladorId) => {
    try {
      setError(null);

      const response = await instalacionesService.asignarInstalador(id, instaladorId);

      if (response.success) {
        console.log('✅ Instalador asignado:', response.instalacion);
        
        // Actualizar en la lista local
        setInstalaciones(prev => 
          prev.map(instalacion => 
            instalacion.id === id ? { ...instalacion, ...response.instalacion } : instalacion
          )
        );
        
        return response;
      } else {
        throw new Error(response.message || 'Error asignando instalador');
      }
    } catch (error) {
      console.error('❌ Error asignando instalador:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Función para eliminar instalación
  const deleteInstalacion = useCallback(async (id) => {
    try {
      setError(null);

      const response = await instalacionesService.deleteInstalacion(id);

      if (response.success) {
        console.log('✅ Instalación eliminada');
        
        // Remover de la lista local
        setInstalaciones(prev => prev.filter(instalacion => instalacion.id !== id));
        
        // Ajustar paginación si es necesario
        setPagination(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1)
        }));
        
        return response;
      } else {
        throw new Error(response.message || 'Error eliminando instalación');
      }
    } catch (error) {
      console.error('❌ Error eliminando instalación:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Función para obtener instalación específica
  const getInstalacion = useCallback(async (id) => {
    try {
      const response = await instalacionesService.getInstalacion(id);
      
      if (response.success) {
        return response.instalacion;
      } else {
        throw new Error(response.message || 'Error obteniendo instalación');
      }
    } catch (error) {
      console.error('❌ Error obteniendo instalación:', error);
      throw error;
    }
  }, []);

  // Efecto para cargar instalaciones cuando cambien dependencias
  useEffect(() => {
    loadInstalaciones();
  }, [loadInstalaciones]);

  // Efecto para auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled || autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (!loading) {
        refresh();
      }
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval, loading, refresh]);

  // Funciones de utilidad
  const getInstalacionById = useCallback((id) => {
    return instalaciones.find(instalacion => instalacion.id === parseInt(id));
  }, [instalaciones]);

  const getInstalacionesByEstado = useCallback((estado) => {
    return instalaciones.filter(instalacion => instalacion.estado === estado);
  }, [instalaciones]);

  const getInstalacionesByInstalador = useCallback((instaladorId) => {
    return instalaciones.filter(instalacion => instalacion.instalador_id === parseInt(instaladorId));
  }, [instalaciones]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    if (!instalaciones.length) {
      return {
        total: 0,
        programadas: 0,
        enProceso: 0,
        completadas: 0,
        canceladas: 0,
        reagendadas: 0,
        vencidas: 0
      };
    }

    const ahora = new Date();
    
    return {
      total: instalaciones.length,
      programadas: instalaciones.filter(i => i.estado === 'programada').length,
      enProceso: instalaciones.filter(i => i.estado === 'en_proceso').length,
      completadas: instalaciones.filter(i => i.estado === 'completada').length,
      canceladas: instalaciones.filter(i => i.estado === 'cancelada').length,
      reagendadas: instalaciones.filter(i => i.estado === 'reagendada').length,
      vencidas: instalaciones.filter(i => {
        return i.estado !== 'completada' && 
               i.estado !== 'cancelada' && 
               new Date(i.fecha_programada) < ahora;
      }).length
    };
  }, [instalaciones]);

  // Estado de carga combinado
  const isLoading = loading || refreshing;

  return {
    // Datos principales
    instalaciones,
    pagination,
    filters,
    loading: isLoading,
    error,
    permissions,
    
    // Estadísticas
    estadisticas,
    loadingEstadisticas,
    metrics,
    
    // Auto refresh
    autoRefreshEnabled,
    autoRefreshInterval,
    setAutoRefreshEnabled,
    setAutoRefreshInterval,
    
    // Funciones de navegación
    changePage,
    changeLimit,
    applyFilters,
    clearFilters,
    refresh,
    
    // Funciones CRUD
    createInstalacion,
    updateInstalacion,
    deleteInstalacion,
    getInstalacion,
    
    // Funciones específicas
    cambiarEstado,
    reagendarInstalacion,
    asignarInstalador,
    
    // Funciones de utilidad
    getInstalacionById,
    getInstalacionesByEstado,
    getInstalacionesByInstalador,
    
    // Funciones de carga
    loadInstalaciones,
    loadEstadisticas
  };
};

// Hook específico para formularios de instalación
export const useInstalacionForm = (instalacionInicial = null) => {
  const [formData, setFormData] = useState({
    cliente_id: '',
    plan_id: '',
    instalador_id: '',
    fecha_programada: '',
    direccion_instalacion: '',
    barrio: '',
    ciudad_id: '',
    telefono_contacto: '',
    persona_recibe: '',
    tipo_instalacion: 'nueva',
    observaciones: '',
    equipos_instalados: [],
    coordenadas_lat: '',
    coordenadas_lng: '',
    costo_instalacion: 0,
    ...instalacionInicial
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Actualizar campo específico
  const updateField = useCallback((field, value) => {
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
  }, [errors]);

  // Validar formulario
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.cliente_id) {
      newErrors.cliente_id = 'Cliente es requerido';
    }

    if (!formData.plan_id) {
      newErrors.plan_id = 'Plan de servicio es requerido';
    }

    if (!formData.fecha_programada) {
      newErrors.fecha_programada = 'Fecha programada es requerida';
    } else {
      const fechaProgramada = new Date(formData.fecha_programada);
      const ahora = new Date();
      if (fechaProgramada <= ahora) {
        newErrors.fecha_programada = 'La fecha programada debe ser futura';
      }
    }

    if (!formData.direccion_instalacion || formData.direccion_instalacion.trim().length < 5) {
      newErrors.direccion_instalacion = 'Dirección debe tener al menos 5 caracteres';
    }

    if (formData.telefono_contacto && formData.telefono_contacto.length > 20) {
      newErrors.telefono_contacto = 'Teléfono no puede exceder 20 caracteres';
    }

    if (formData.costo_instalacion < 0) {
      newErrors.costo_instalacion = 'El costo no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData({
      cliente_id: '',
      plan_id: '',
      instalador_id: '',
      fecha_programada: '',
      direccion_instalacion: '',
      barrio: '',
      ciudad_id: '',
      telefono_contacto: '',
      persona_recibe: '',
      tipo_instalacion: 'nueva',
      observaciones: '',
      equipos_instalados: [],
      coordenadas_lat: '',
      coordenadas_lng: '',
      costo_instalacion: 0
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    loading,
    setLoading,
    updateField,
    validateForm,
    resetForm,
    setFormData,
    setErrors
  };
};

export default useInstalaciones;