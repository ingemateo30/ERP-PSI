// frontend/src/components/Config/ConfigNotifications.js

import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, X, ArrowRight, ExternalLink,
  Building2, CreditCard, MapPin, Package, Settings, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../hooks/useConfig';

// Mapeo de iconos
const iconMap = {
  'building': Building2,
  'credit-card': CreditCard,
  'map-pin': MapPin,
  'package': Package,
  'settings': Settings
};

const ConfigNotifications = ({ 
  showProgress = false, 
  showTasks = true, 
  maxTasks = 3,
  variant = 'default' // 'default', 'compact', 'sidebar'
}) => {
  const navigate = useNavigate();
  const {
    isConfigComplete,
    pendingTasks,
    configStats,
    loading
  } = useConfig();
  
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed) return null;

  // Si está completo y no hay tareas pendientes, mostrar éxito
  if (isConfigComplete && pendingTasks.length === 0) {
    return (
      <ConfigSuccessAlert 
        onDismiss={() => setDismissed(true)}
        variant={variant}
      />
    );
  }

  // Si hay tareas pendientes, mostrar alerta de configuración
  if (pendingTasks.length > 0) {
    return (
      <ConfigPendingAlert
        tasks={pendingTasks}
        configStats={configStats}
        onDismiss={() => setDismissed(true)}
        onNavigate={navigate}
        showProgress={showProgress}
        showTasks={showTasks}
        maxTasks={maxTasks}
        variant={variant}
      />
    );
  }

  return null;
};

// Componente para alerta de configuración completa
const ConfigSuccessAlert = ({ onDismiss, variant }) => {
  const baseClasses = "bg-green-50 border border-green-200 rounded-lg p-4";
  const compactClasses = variant === 'compact' ? "p-3" : "";

  return (
    <div className={`${baseClasses} ${compactClasses}`}>
      <div className="flex items-start justify-between">
        <div className="flex">
          <CheckCircle className={`${variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} text-green-600 mt-0.5`} />
          <div className="ml-3">
            <h3 className={`${variant === 'compact' ? 'text-xs' : 'text-sm'} font-medium text-green-800`}>
              ¡Configuración completa!
            </h3>
            <p className={`mt-1 ${variant === 'compact' ? 'text-xs' : 'text-sm'} text-green-700`}>
              El sistema está correctamente configurado y listo para gestionar clientes.
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-green-100 rounded-md transition-colors"
        >
          <X size={variant === 'compact' ? 14 : 16} className="text-green-600" />
        </button>
      </div>
    </div>
  );
};

// Componente para alerta de configuración pendiente
const ConfigPendingAlert = ({ 
  tasks, 
  configStats, 
  onDismiss, 
  onNavigate, 
  showProgress, 
  showTasks, 
  maxTasks,
  variant 
}) => {
  const highPriorityTasks = tasks.filter(task => task.priority === 'high');
  const hasUrgentTasks = highPriorityTasks.length > 0;
  
  const alertBg = hasUrgentTasks ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
  const iconColor = hasUrgentTasks ? 'text-red-600' : 'text-orange-600';
  const textColor = hasUrgentTasks ? 'text-red-800' : 'text-orange-800';
  const descColor = hasUrgentTasks ? 'text-red-700' : 'text-orange-700';
  const buttonColor = hasUrgentTasks ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-orange-300 text-orange-700 hover:bg-orange-50';
  const progressColor = hasUrgentTasks ? 'bg-red-500' : 'bg-orange-500';

  const baseClasses = `${alertBg} border rounded-lg p-4`;
  const compactClasses = variant === 'compact' ? "p-3" : "";

  return (
    <div className={`${baseClasses} ${compactClasses}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-1">
          <AlertTriangle className={`${variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} ${iconColor} mt-0.5`} />
          <div className="ml-3 flex-1">
            <h3 className={`${variant === 'compact' ? 'text-xs' : 'text-sm'} font-medium ${textColor}`}>
              {hasUrgentTasks ? 'Configuración urgente requerida' : 'Configuración incompleta'}
            </h3>
            <p className={`mt-1 ${variant === 'compact' ? 'text-xs' : 'text-sm'} ${descColor}`}>
              Hay {tasks.length} tarea{tasks.length > 1 ? 's' : ''} de configuración pendiente{tasks.length > 1 ? 's' : ''} 
              {hasUrgentTasks ? ' críticas' : ''} para completar la configuración del sistema.
            </p>
            
            {/* Barra de progreso */}
            {showProgress && configStats && variant !== 'compact' && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progreso de configuración</span>
                  <span>{Math.round(configStats.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                    style={{ width: `${configStats.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{configStats.completedSteps} de {configStats.totalSteps} completadas</span>
                  <span>{configStats.remaining} restantes</span>
                </div>
              </div>
            )}
            
            {/* Botones de tareas */}
            {showTasks && variant !== 'sidebar' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tasks.slice(0, maxTasks).map((task) => {
                  const IconComponent = iconMap[task.icon];
                  return (
                    <button
                      key={task.id}
                      onClick={() => onNavigate(task.path)}
                      className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-md bg-white transition-colors ${buttonColor}`}
                    >
                      {IconComponent && <IconComponent size={12} className="mr-1" />}
                      <span className="mr-1">{task.title}</span>
                      <ArrowRight size={10} />
                    </button>
                  );
                })}
                
                {tasks.length > maxTasks && (
                  <button
                    onClick={() => onNavigate('/config')}
                    className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-md bg-white transition-colors ${buttonColor}`}
                  >
                    Ver todas ({tasks.length})
                    <ExternalLink size={10} className="ml-1" />
                  </button>
                )}
              </div>
            )}

            {/* Lista de tareas para variant sidebar */}
            {showTasks && variant === 'sidebar' && (
              <div className="mt-3 space-y-2">
                {tasks.slice(0, maxTasks).map((task) => {
                  const IconComponent = iconMap[task.icon];
                  return (
                    <button
                      key={task.id}
                      onClick={() => onNavigate(task.path)}
                      className="w-full text-left p-2 rounded border bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {IconComponent && <IconComponent size={14} className="mr-2 text-gray-500" />}
                          <div>
                            <div className="text-xs font-medium text-gray-900">{task.title}</div>
                            <div className="text-xs text-gray-500">{task.description}</div>
                          </div>
                        </div>
                        <ArrowRight size={12} className="text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className={`p-1 hover:bg-opacity-20 rounded-md transition-colors ${hasUrgentTasks ? 'hover:bg-red-100' : 'hover:bg-orange-100'}`}
        >
          <X size={variant === 'compact' ? 14 : 16} className={iconColor} />
        </button>
      </div>
    </div>
  );
};

// Componente específico para mostrar en el sidebar
export const ConfigSidebarNotification = () => {
  const { pendingTasks, isConfigComplete } = useConfig();
  const navigate = useNavigate();

  if (isConfigComplete || pendingTasks.length === 0) return null;

  const urgentTasks = pendingTasks.filter(task => task.priority === 'high');
  const hasUrgent = urgentTasks.length > 0;

  return (
    <div className="p-3 border-t border-white/10">
      <div className={`p-3 rounded-lg ${hasUrgent ? 'bg-red-500/10 border border-red-400/30' : 'bg-orange-500/10 border border-orange-400/30'}`}>
        <div className="flex items-center mb-2">
          <AlertTriangle size={16} className={hasUrgent ? 'text-red-200' : 'text-orange-200'} />
          <span className="ml-2 text-sm font-medium text-white">
            Configuración pendiente
          </span>
        </div>
        <p className="text-xs text-white/80 mb-3">
          {pendingTasks.length} tarea{pendingTasks.length > 1 ? 's' : ''} pendiente{pendingTasks.length > 1 ? 's' : ''}
        </p>
        <button
          onClick={() => navigate('/config')}
          className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center"
        >
          <Settings size={14} className="mr-1" />
          Configurar ahora
        </button>
      </div>
    </div>
  );
};

// Componente para badge de configuración
export const ConfigBadge = ({ onClick, className = "" }) => {
  const { pendingTasks, isConfigComplete } = useConfig();

  if (isConfigComplete) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
        <CheckCircle size={12} className="mr-1" />
        Configurado
      </span>
    );
  }

  if (pendingTasks.length > 0) {
    const hasUrgent = pendingTasks.some(task => task.priority === 'high');
    
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          hasUrgent 
            ? 'bg-red-100 text-red-800 hover:bg-red-200' 
            : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
        } transition-colors ${className}`}
      >
        <AlertTriangle size={12} className="mr-1" />
        {pendingTasks.length} pendiente{pendingTasks.length > 1 ? 's' : ''}
      </button>
    );
  }

  return null;
};

// Componente de información de configuración
export const ConfigInfo = ({ className = "" }) => {
  const { counters, isConfigComplete } = useConfig();

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">
            Estado de configuración
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-blue-700">
            <div>Departamentos: {counters.departamentos}</div>
            <div>Ciudades: {counters.ciudades}</div>
            <div>Sectores: {counters.sectores_activos}</div>
            <div>Bancos: {counters.bancos_activos}</div>
            <div>Planes: {counters.planes_activos}</div>
            <div>Conceptos: {counters.conceptos_activos}</div>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isConfigComplete ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {isConfigComplete ? 'Configuración completa' : 'Configuración incompleta'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigNotifications;