// frontend/src/hooks/useConfig.js - VERSIÓN ROBUSTA CON MANEJO DE UNDEFINED

import { useState, useEffect, useCallback } from 'react';
import configService from '../services/configService';

/**
 * Hook principal para configuración - VERSIÓN ROBUSTA
 */
export const useConfig = () => {
  // Estados principales con valores por defecto seguros
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Estados específicos para geografía con arrays vacíos por defecto
  const [cities, setCities] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [sectorsLoading, setSectorsLoading] = useState(false);

  // Debug function
  const logDebug = (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 useConfig: ${message}`, data);
    }
  };

  // Cargar ciudades
  const loadCities = useCallback(async (departamentoId = null) => {
    logDebug('Iniciando carga de ciudades', { departamentoId });
    
    try {
      setCitiesLoading(true);
      setError(null);
      
      const response = await configService.getCities(departamentoId, false);
      
      logDebug('Respuesta de getCities', response);
      
      if (response && response.success && Array.isArray(response.data)) {
        const citiesData = response.data;
        setCities(citiesData);
        logDebug('Ciudades cargadas exitosamente', { count: citiesData.length });
      } else {
        logDebug('Error o datos inválidos de getCities', response);
        setCities([]);
        if (response && !response.success) {
          setError(response.message || 'Error cargando ciudades');
        }
      }
    } catch (err) {
      logDebug('Error en loadCities', err);
      console.error('❌ Error cargando ciudades:', err);
      setCities([]);
      setError('Error de conexión al cargar ciudades');
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  // Cargar sectores
  const loadSectors = useCallback(async (ciudadId = null) => {
    logDebug('Iniciando carga de sectores', { ciudadId });
    
    try {
      setSectorsLoading(true);
      setError(null);
      
      const response = await configService.getSectors(ciudadId, true, false);
      
      logDebug('Respuesta de getSectors', response);
      
      if (response && response.success && Array.isArray(response.data)) {
        const sectorsData = response.data;
        setSectors(sectorsData);
        logDebug('Sectores cargados exitosamente', { count: sectorsData.length });
      } else {
        logDebug('Error o datos inválidos de getSectors', response);
        setSectors([]);
        if (response && !response.success) {
          setError(response.message || 'Error cargando sectores');
        }
      }
    } catch (err) {
      logDebug('Error en loadSectors', err);
      console.error('❌ Error cargando sectores:', err);
      setSectors([]);
      setError('Error de conexión al cargar sectores');
    } finally {
      setSectorsLoading(false);
    }
  }, []);

  // Cargar departamentos
  const loadDepartments = useCallback(async () => {
    logDebug('Iniciando carga de departamentos');
    
    try {
      const response = await configService.getDepartments(false);
      
      logDebug('Respuesta de getDepartments', response);
      
      if (response && response.success && Array.isArray(response.data)) {
        const departmentsData = response.data;
        setDepartments(departmentsData);
        logDebug('Departamentos cargados exitosamente', { count: departmentsData.length });
      } else {
        logDebug('Error o datos inválidos de getDepartments', response);
        setDepartments([]);
      }
    } catch (err) {
      logDebug('Error en loadDepartments', err);
      console.error('❌ Error cargando departamentos:', err);
      setDepartments([]);
    }
  }, []);

  // Cargar resumen de configuración
  const loadOverview = useCallback(async () => {
    logDebug('Iniciando carga de overview');
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await configService.getConfigOverview();
      
      logDebug('Respuesta de getConfigOverview', response);
      
      if (response && response.success) {
        const overviewData = response.data || {};
        setOverview(overviewData);
        setLastUpdate(new Date());
        logDebug('Overview cargado exitosamente', overviewData);
      } else {
        logDebug('Error en getConfigOverview', response);
        setError(response?.message || 'Error cargando configuración');
        // Establecer overview por defecto para evitar crashes
        setOverview({
          empresa_configurada: false,
          configuracion_completa: false,
          porcentaje_completado: 0,
          contadores: {
            departamentos: 0,
            ciudades: 0,
            sectores_activos: 0,
            bancos_activos: 0,
            planes_activos: 0,
            conceptos_activos: 0
          }
        });
      }
    } catch (err) {
      logDebug('Error en loadOverview', err);
      console.error('❌ Error cargando overview:', err);
      setError('Error de conexión al cargar configuración');
      // Establecer overview por defecto para evitar crashes
      setOverview({
        empresa_configurada: false,
        configuracion_completa: false,
        porcentaje_completado: 0,
        contadores: {
          departamentos: 0,
          ciudades: 0,
          sectores_activos: 0,
          bancos_activos: 0,
          planes_activos: 0,
          conceptos_activos: 0
        }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para cargar todo inicialmente
  const loadAllData = useCallback(async () => {
    logDebug('Cargando todos los datos iniciales');
    
    try {
      // Cargar datos geográficos en paralelo
      await Promise.allSettled([
        loadDepartments(),
        loadCities(),
        loadSectors()
      ]);
      
      // Cargar overview después
      await loadOverview();
      
      logDebug('Carga de datos completada');
    } catch (error) {
      logDebug('Error cargando datos iniciales', error);
      console.error('❌ Error cargando datos iniciales:', error);
    }
  }, [loadDepartments, loadCities, loadSectors, loadOverview]);

  // Efecto para cargar datos al montar el componente
  useEffect(() => {
    logDebug('useConfig montado, iniciando carga de datos');
    loadAllData();
  }, [loadAllData]);

  // Función de refresh
  const refresh = useCallback(async () => {
    logDebug('Refrescando todos los datos');
    await loadAllData();
  }, [loadAllData]);

  // Funciones de utilidad con valores seguros
  const isConfigComplete = Boolean(overview?.configuracion_completa);
  const isCompanyConfigured = Boolean(overview?.empresa_configurada);

  const getCounters = useCallback(() => {
    const contadores = overview?.contadores || {};
    return {
      departamentos: Number(contadores.departamentos) || 0,
      ciudades: Number(contadores.ciudades) || 0,
      sectores_activos: Number(contadores.sectores_activos) || 0,
      bancos_activos: Number(contadores.bancos_activos) || 0,
      planes_activos: Number(contadores.planes_activos) || 0,
      conceptos_activos: Number(contadores.conceptos_activos) || 0
    };
  }, [overview]);

  const getPendingTasks = useCallback(() => {
    if (!overview || !overview.contadores) return [];
    
    const tasks = [];
    const contadores = overview.contadores;
    
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
    if ((contadores.bancos_activos || 0) === 0) {
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
    if ((contadores.sectores_activos || 0) === 0) {
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
    if ((contadores.planes_activos || 0) === 0) {
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

  // Asegurar que siempre devolvemos arrays
  const safeCities = Array.isArray(cities) ? cities : [];
  const safeSectors = Array.isArray(sectors) ? sectors : [];
  const safeDepartments = Array.isArray(departments) ? departments : [];

  // Debug del estado actual
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logDebug('Estado actual del hook', {
        overview: !!overview,
        citiesCount: safeCities.length,
        sectorsCount: safeSectors.length,
        departmentsCount: safeDepartments.length,
        loading,
        error,
        isConfigComplete,
        isCompanyConfigured
      });
    }
  }, [overview, safeCities, safeSectors, safeDepartments, loading, error, isConfigComplete, isCompanyConfigured]);

  return {
    // Datos principales
    overview,
    loading: loading || citiesLoading || sectorsLoading,
    error,
    lastUpdate,
    
    // Datos geográficos específicos (siempre arrays)
    cities: safeCities,
    sectors: safeSectors,
    departments: safeDepartments,
    citiesLoading,
    sectorsLoading,
    
    // Estado de configuración
    isConfigComplete,
    isCompanyConfigured,
    
    // Funciones
    refresh,
    loadCities,
    loadSectors,
    loadDepartments,
    getPendingTasks,
    getConfigStats,
    getCounters,
    isFeatureEnabled,
    getRecommendations,
    
    // Datos computados (siempre definidos)
    pendingTasks: getPendingTasks(),
    configStats: getConfigStats(),
    counters: getCounters(),
    recommendations: getRecommendations()
  };
};

/**
 * Hook simplificado para configuración de empresa
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
      if (response && response.success) {
        setConfig(response.data?.config || null);
      } else {
        setError(response?.message || 'Error cargando configuración');
      }
    } catch (err) {
      console.error('Error cargando configuración de empresa:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await configService.updateCompanyConfig(newConfig);
      if (response && response.success) {
        setConfig(response.data?.config || newConfig);
        return response;
      } else {
        setError(response?.message || 'Error actualizando configuración');
        throw new Error(response?.message || 'Error actualizando configuración');
      }
    } catch (err) {
      console.error('Error actualizando configuración de empresa:', err);
      setError('Error de conexión');
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
    isConfigured: Boolean(config && config.empresa_nombre && config.empresa_nit)
  };
};

/**
 * Hook para notificaciones de configuración
 */
export const useConfigNotifications = () => {
  const { pendingTasks = [], isConfigComplete, overview } = useConfig();
  const [dismissed, setDismissed] = useState(new Set());

  // Obtener notificaciones activas
  const getNotifications = useCallback(() => {
    const notifications = [];
    
    if (!isConfigComplete && Array.isArray(pendingTasks) && pendingTasks.length > 0) {
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