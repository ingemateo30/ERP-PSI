// frontend/src/hooks/useConfig.js - CORREGIDO PARA CIUDADES Y SECTORES

import { useState, useEffect, useCallback } from 'react';
import configService from '../services/configService';

/**
 * Hook personalizado para manejar el estado de configuración del sistema
 */
export const useConfig = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Estados adicionales para ciudades y sectores
  const [cities, setCities] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [sectorsLoading, setSectorsLoading] = useState(false);

  // Cargar resumen de configuración
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await configService.getConfigOverview();
      setOverview(response.data);
      setLastUpdate(new Date());
      
      return response.data;
    } catch (err) {
      console.error('Error cargando configuración:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar ciudades
  const loadCities = useCallback(async (departamentoId = null) => {
    try {
      setCitiesLoading(true);
      const response = await configService.getCities(departamentoId, false);
      
      if (response.success) {
        setCities(response.data || []);
      } else {
        console.error('Error cargando ciudades:', response.message);
        setCities([]);
      }
    } catch (err) {
      console.error('Error cargando ciudades:', err);
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  // Cargar sectores
  const loadSectors = useCallback(async (ciudadId = null) => {
    try {
      setSectorsLoading(true);
      const response = await configService.getSectors(ciudadId, true, false); // ciudadId, activo, includeStats
      
      if (response.success) {
        setSectors(response.data || []);
      } else {
        console.error('Error cargando sectores:', response.message);
        setSectors([]);
      }
    } catch (err) {
      console.error('Error cargando sectores:', err);
      setSectors([]);
    } finally {
      setSectorsLoading(false);
    }
  }, []);

  // Cargar departamentos
  const loadDepartments = useCallback(async () => {
    try {
      const response = await configService.getDepartments(false);
      
      if (response.success) {
        setDepartments(response.data || []);
      } else {
        console.error('Error cargando departamentos:', response.message);
        setDepartments([]);
      }
    } catch (err) {
      console.error('Error cargando departamentos:', err);
      setDepartments([]);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadOverview(),
          loadDepartments(),
          loadCities(), // Cargar todas las ciudades inicialmente
          loadSectors() // Cargar todos los sectores inicialmente
        ]);
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      }
    };

    loadInitialData();
  }, [loadOverview, loadDepartments, loadCities, loadSectors]);

  // Función para refrescar la configuración
  const refresh = useCallback(() => {
    return loadOverview();
  }, [loadOverview]);

  // Verificar si la configuración está completa
  const isConfigComplete = overview?.configuracion_completa || false;

  // Verificar si la empresa está configurada
  const isCompanyConfigured = overview?.empresa_configurada || false;

  // Obtener tareas pendientes de configuración
  const getPendingTasks = useCallback(() => {
    if (!overview) return [];
    
    const tasks = [];
    
    // Verificar configuración de empresa
    if (!overview.empresa_configurada) {
      tasks.push({
        id: 'company',
        title: 'Configurar Empresa',
        description: 'Completa los datos básicos de tu empresa',
        priority: 'high',
        path: '/config/company',
        icon: 'building',
        category: 'basic'
      });
    }
    
    // Verificar bancos
    if ((overview.contadores?.bancos_activos || 0) === 0) {
      tasks.push({
        id: 'banks',
        title: 'Agregar Bancos',
        description: 'Configura los bancos para registro de pagos',
        priority: 'medium',
        path: '/config/banks',
        icon: 'credit-card',
        category: 'payments'
      });
    }
    
    // Verificar geografía
    if ((overview.contadores?.sectores_activos || 0) === 0) {
      tasks.push({
        id: 'geography',
        title: 'Configurar Geografía',
        description: 'Define departamentos, ciudades y sectores',
        priority: 'medium',
        path: '/config/geography',
        icon: 'map-pin',
        category: 'geography'
      });
    }
    
    // Verificar planes de servicio
    if ((overview.contadores?.planes_activos || 0) === 0) {
      tasks.push({
        id: 'service-plans',
        title: 'Crear Planes de Servicio',
        description: 'Define los planes de internet y TV',
        priority: 'high',
        path: '/config/service-plans',
        icon: 'package',
        category: 'services'
      });
    }
    
    return tasks;
  }, [overview]);

  // Obtener estadísticas de configuración
  const getConfigStats = useCallback(() => {
    if (!overview) return null;
    
    const totalSteps = 4; // empresa, bancos, geografía, planes
    const completedSteps = [
      overview.empresa_configurada,
      (overview.contadores?.bancos_activos || 0) > 0,
      (overview.contadores?.sectores_activos || 0) > 0,
      (overview.contadores?.planes_activos || 0) > 0
    ].filter(Boolean).length;
    
    return {
      totalSteps,
      completedSteps,
      progress: (completedSteps / totalSteps) * 100,
      isComplete: completedSteps === totalSteps,
      remaining: totalSteps - completedSteps
    };
  }, [overview]);

  // Obtener contadores de configuración
  const getCounters = useCallback(() => {
    return {
      departamentos: overview?.contadores?.departamentos || 0,
      ciudades: overview?.contadores?.ciudades || 0,
      sectores_activos: overview?.contadores?.sectores_activos || 0,
      bancos_activos: overview?.contadores?.bancos_activos || 0,
      planes_activos: overview?.contadores?.planes_activos || 0,
      conceptos_activos: overview?.contadores?.conceptos_activos || 0
    };
  }, [overview]);

  // Verificar si una funcionalidad específica está habilitada
  const isFeatureEnabled = useCallback((feature) => {
    const counters = getCounters();
    
    switch (feature) {
      case 'clients':
        return isCompanyConfigured && counters.sectores_activos > 0;
      case 'invoicing':
        return isCompanyConfigured && counters.bancos_activos > 0;
      case 'services':
        return counters.planes_activos > 0;
      case 'payments':
        return counters.bancos_activos > 0;
      default:
        return false;
    }
  }, [isCompanyConfigured, getCounters]);

  // Obtener recomendaciones de configuración
  const getRecommendations = useCallback(() => {
    const tasks = getPendingTasks();
    const recommendations = [];
    
    // Ordenar por prioridad
    const highPriorityTasks = tasks.filter(task => task.priority === 'high');
    const mediumPriorityTasks = tasks.filter(task => task.priority === 'medium');
    
    if (highPriorityTasks.length > 0) {
      recommendations.push({
        type: 'urgent',
        title: 'Configuración urgente requerida',
        description: `Hay ${highPriorityTasks.length} configuración(es) crítica(s) pendiente(s)`,
        tasks: highPriorityTasks,
        action: 'Configure ahora'
      });
    }
    
    if (mediumPriorityTasks.length > 0) {
      recommendations.push({
        type: 'suggested',
        title: 'Configuración recomendada',
        description: `Complete estas ${mediumPriorityTasks.length} configuración(es) para mejorar la funcionalidad`,
        tasks: mediumPriorityTasks,
        action: 'Configure cuando sea posible'
      });
    }
    
    return recommendations;
  }, [getPendingTasks]);

  return {
    // Datos principales
    overview,
    loading: loading || citiesLoading || sectorsLoading,
    error,
    lastUpdate,
    
    // Datos geográficos específicos
    cities,
    sectors,
    departments,
    citiesLoading,
    sectorsLoading,
    
    // Estado de configuración
    isConfigComplete,
    isCompanyConfigured,
    
    // Funciones de utilidad
    refresh,
    loadCities,
    loadSectors,
    loadDepartments,
    getPendingTasks,
    getConfigStats,
    getCounters,
    isFeatureEnabled,
    getRecommendations,
    
    // Datos computados
    pendingTasks: getPendingTasks(),
    configStats: getConfigStats(),
    counters: getCounters(),
    recommendations: getRecommendations()
  };
};

/**
 * Hook para manejar configuración específica de empresa
 */
export const useCompanyConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await configService.getCompanyConfig();
      setConfig(response.data?.config || null);
      
      return response.data?.config;
    } catch (err) {
      console.error('Error cargando configuración de empresa:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await configService.updateCompanyConfig(newConfig);
      setConfig(response.data?.config || newConfig);
      
      return response.data?.config;
    } catch (err) {
      console.error('Error actualizando configuración de empresa:', err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    saving,
    loadConfig,
    updateConfig,
    isConfigured: config && config.empresa_nombre && config.empresa_nit
  };
};

/**
 * Hook para notificaciones de configuración
 */
export const useConfigNotifications = () => {
  const { pendingTasks, isConfigComplete, overview } = useConfig();
  const [dismissed, setDismissed] = useState(new Set());

  // Obtener notificaciones activas
  const getNotifications = useCallback(() => {
    const notifications = [];
    
    if (!isConfigComplete && pendingTasks.length > 0) {
      const highPriorityTasks = pendingTasks.filter(task => 
        task.priority === 'high' && !dismissed.has(task.id)
      );
      
      if (highPriorityTasks.length > 0) {
        notifications.push({
          id: 'config-incomplete',
          type: 'warning',
          title: 'Configuración incompleta',
          message: `Hay ${highPriorityTasks.length} configuración(es) crítica(s) pendiente(s)`,
          tasks: highPriorityTasks,
          persistent: true
        });
      }
    }
    
    return notifications;
  }, [isConfigComplete, pendingTasks, dismissed]);

  const dismissNotification = useCallback((notificationId) => {
    setDismissed(prev => new Set([...prev, notificationId]));
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissed(new Set());
  }, []);

  return {
    notifications: getNotifications(),
    dismissNotification,
    clearDismissed,
    hasNotifications: getNotifications().length > 0
  };
};

export default useConfig;