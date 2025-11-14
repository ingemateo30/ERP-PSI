// frontend/src/constants/instalacionesConstants.js

// Estados de instalación
export const ESTADOS_INSTALACION = {
  PROGRAMADA: 'programada',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  REAGENDADA: 'reagendada'
};

// Etiquetas de estados
export const ESTADOS_LABELS = {
  [ESTADOS_INSTALACION.PROGRAMADA]: 'Programada',
  [ESTADOS_INSTALACION.EN_PROCESO]: 'En Proceso',
  [ESTADOS_INSTALACION.COMPLETADA]: 'Completada',
  [ESTADOS_INSTALACION.CANCELADA]: 'Cancelada',
  [ESTADOS_INSTALACION.REAGENDADA]: 'Reagendada'
};

// Colores de estados
export const ESTADOS_COLORS = {
  [ESTADOS_INSTALACION.PROGRAMADA]: 'blue',
  [ESTADOS_INSTALACION.EN_PROCESO]: 'yellow',
  [ESTADOS_INSTALACION.COMPLETADA]: 'green',
  [ESTADOS_INSTALACION.CANCELADA]: 'red',
  [ESTADOS_INSTALACION.REAGENDADA]: 'purple'
};

// Clases CSS para estados
export const ESTADOS_CSS = {
  [ESTADOS_INSTALACION.PROGRAMADA]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ESTADOS_INSTALACION.EN_PROCESO]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ESTADOS_INSTALACION.COMPLETADA]: 'bg-green-100 text-green-800 border-green-200',
  [ESTADOS_INSTALACION.CANCELADA]: 'bg-red-100 text-red-800 border-red-200',
  [ESTADOS_INSTALACION.REAGENDADA]: 'bg-purple-100 text-purple-800 border-purple-200'
};

// Tipos de instalación
export const TIPOS_INSTALACION = {
  NUEVA: 'nueva',
  MIGRACION: 'migracion',
  UPGRADE: 'upgrade',
  REPARACION: 'reparacion'
};

// Etiquetas de tipos
export const TIPOS_LABELS = {
  [TIPOS_INSTALACION.NUEVA]: 'Nueva Instalación',
  [TIPOS_INSTALACION.MIGRACION]: 'Migración',
  [TIPOS_INSTALACION.UPGRADE]: 'Actualización',
  [TIPOS_INSTALACION.REPARACION]: 'Reparación'
};

// Colores de tipos
export const TIPOS_COLORS = {
  [TIPOS_INSTALACION.NUEVA]: 'green',
  [TIPOS_INSTALACION.MIGRACION]: 'blue',
  [TIPOS_INSTALACION.UPGRADE]: 'yellow',
  [TIPOS_INSTALACION.REPARACION]: 'red'
};

// Prioridades de instalación
export const PRIORIDADES = {
  BAJA: 'baja',
  NORMAL: 'normal',
  ALTA: 'alta',
  URGENTE: 'urgente'
};

// Etiquetas de prioridades
export const PRIORIDADES_LABELS = {
  [PRIORIDADES.BAJA]: 'Baja',
  [PRIORIDADES.NORMAL]: 'Normal',
  [PRIORIDADES.ALTA]: 'Alta',
  [PRIORIDADES.URGENTE]: 'Urgente'
};

// Tipos de equipos
export const TIPOS_EQUIPOS = {
  ROUTER: 'router',
  DECODIFICADOR: 'decodificador',
  CABLE: 'cable',
  ANTENA: 'antena',
  SPLITTER: 'splitter',
  AMPLIFICADOR: 'amplificador',
  OTRO: 'otro'
};

// Etiquetas de equipos
export const EQUIPOS_LABELS = {
  [TIPOS_EQUIPOS.ROUTER]: 'Router',
  [TIPOS_EQUIPOS.DECODIFICADOR]: 'Decodificador',
  [TIPOS_EQUIPOS.CABLE]: 'Cable',
  [TIPOS_EQUIPOS.ANTENA]: 'Antena',
  [TIPOS_EQUIPOS.SPLITTER]: 'Splitter',
  [TIPOS_EQUIPOS.AMPLIFICADOR]: 'Amplificador',
  [TIPOS_EQUIPOS.OTRO]: 'Otro'
};

// Permisos por rol
export const ROLE_PERMISSIONS = {
  administrador: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewAll: true,
    canAssignInstaller: true,
    canReschedule: true,
    canViewStats: true,
    canChangeStatus: true,
    canManageEquipment: true,
    canViewMap: true
  },
  supervisor: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewAll: true,
    canAssignInstaller: true,
    canReschedule: true,
    canViewStats: true,
    canChangeStatus: true,
    canManageEquipment: true,
    canViewMap: true
  },
  instalador: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canViewAll: false, // No puede ver todas, solo las asignadas a él
    canAssignInstaller: false,
    canReschedule: false,
    canViewStats: false,
    canChangeStatus: true, // Solo sus propias instalaciones
    canManageEquipment: false,
    canViewMap: true // Puede ver el mapa pero solo con sus instalaciones
  }
};

// Configuración de paginación
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMIT_OPTIONS: [10, 25, 50, 100],
  MAX_LIMIT: 100
};

// Configuración de filtros
export const FILTER_CONFIG = {
  SEARCH_MIN_LENGTH: 2,
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:MM:SS'
};

// Mensajes de confirmación
export const CONFIRMATION_MESSAGES = {
  DELETE: '¿Estás seguro de que deseas eliminar esta instalación?',
  CANCEL: '¿Estás seguro de que deseas cancelar esta instalación?',
  RESCHEDULE: '¿Estás seguro de que deseas reagendar esta instalación?',
  COMPLETE: '¿Confirmas que la instalación ha sido completada exitosamente?',
  ASSIGN: '¿Estás seguro de que deseas asignar este instalador?'
};

// Mensajes de éxito
export const SUCCESS_MESSAGES = {
  CREATED: 'Instalación creada exitosamente',
  UPDATED: 'Instalación actualizada exitosamente',
  DELETED: 'Instalación eliminada exitosamente',
  STATUS_CHANGED: 'Estado de instalación actualizado',
  RESCHEDULED: 'Instalación reagendada exitosamente',
  INSTALLER_ASSIGNED: 'Instalador asignado exitosamente'
};

// Mensajes de error
export const ERROR_MESSAGES = {
  GENERIC: 'Ha ocurrido un error inesperado',
  NETWORK: 'Error de conexión. Verifica tu conexión a internet',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción',
  NOT_FOUND: 'Instalación no encontrada',
  VALIDATION: 'Por favor verifica los datos ingresados',
  SERVER: 'Error interno del servidor. Intenta más tarde'
};

// Configuración de formularios
export const FORM_CONFIG = {
  REQUIRED_FIELDS: ['cliente_id', 'plan_id', 'fecha_programada', 'direccion_instalacion'],
  MIN_ADDRESS_LENGTH: 5,
  MAX_ADDRESS_LENGTH: 255,
  MAX_OBSERVATIONS_LENGTH: 1000,
  MAX_PHONE_LENGTH: 20,
  MAX_NAME_LENGTH: 255
};

// Configuración de horarios
export const SCHEDULE_CONFIG = {
  WORK_HOURS_START: '08:00',
  WORK_HOURS_END: '18:00',
  DEFAULT_DURATION_MINUTES: 120,
  MIN_ADVANCE_HOURS: 24
};

// Opciones de tiempo para selects
export const TIME_OPTIONS = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' }
];

// Configuración de mapas
export const MAP_CONFIG = {
  DEFAULT_CENTER: {
    lat: 6.2442,
    lng: -75.5812
  },
  DEFAULT_ZOOM: 12,
  MARKER_COLORS: {
    [ESTADOS_INSTALACION.PROGRAMADA]: '#3B82F6',
    [ESTADOS_INSTALACION.EN_PROCESO]: '#F59E0B',
    [ESTADOS_INSTALACION.COMPLETADA]: '#10B981',
    [ESTADOS_INSTALACION.CANCELADA]: '#EF4444',
    [ESTADOS_INSTALACION.REAGENDADA]: '#8B5CF6'
  }
};

// Configuración de notificaciones
export const NOTIFICATION_CONFIG = {
  AUTO_HIDE_DELAY: 5000,
  POSITIONS: {
    TOP_RIGHT: 'top-right',
    TOP_LEFT: 'top-left',
    BOTTOM_RIGHT: 'bottom-right',
    BOTTOM_LEFT: 'bottom-left'
  }
};

// Configuración de exportación
export const EXPORT_CONFIG = {
  FORMATS: ['xlsx', 'csv', 'pdf'],
  MAX_RECORDS: 1000,
  FILENAME_PREFIX: 'instalaciones_'
};

// Configuración de refresh automático
export const AUTO_REFRESH_CONFIG = {
  ENABLED: true,
  INTERVAL_MS: 30000, // 30 segundos
  INTERVALS: [
    { value: 10000, label: '10 segundos' },
    { value: 30000, label: '30 segundos' },
    { value: 60000, label: '1 minuto' },
    { value: 300000, label: '5 minutos' },
    { value: 0, label: 'Desactivado' }
  ]
};

// Configuración de validaciones de fechas
export const DATE_VALIDATIONS = {
  MIN_FUTURE_HOURS: 1,
  MAX_FUTURE_DAYS: 365,
  BUSINESS_HOURS_START: 8,
  BUSINESS_HOURS_END: 18,
  WEEKEND_ALLOWED: false
};

// Configuración de tooltips
export const TOOLTIP_CONFIG = {
  DELAY_SHOW: 500,
  DELAY_HIDE: 200,
  PLACEMENT: 'top'
};

// URLs de ayuda
export const HELP_URLS = {
  GENERAL: '/help/instalaciones',
  CREAR: '/help/instalaciones/crear',
  ESTADOS: '/help/instalaciones/estados',
  EQUIPOS: '/help/instalaciones/equipos'
};

// Configuración de campos de búsqueda
export const SEARCH_FIELDS = [
  { value: 'all', label: 'Todos los campos' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'direccion', label: 'Dirección' },
  { value: 'instalador', label: 'Instalador' },
  { value: 'plan', label: 'Plan' }
];

export default {
  ESTADOS_INSTALACION,
  ESTADOS_LABELS,
  ESTADOS_COLORS,
  ESTADOS_CSS,
  TIPOS_INSTALACION,
  TIPOS_LABELS,
  TIPOS_COLORS,
  TIPOS_EQUIPOS,
  EQUIPOS_LABELS,
  ROLE_PERMISSIONS,
  PAGINATION_CONFIG,
  FILTER_CONFIG,
  CONFIRMATION_MESSAGES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  FORM_CONFIG,
  SCHEDULE_CONFIG,
  TIME_OPTIONS,
  MAP_CONFIG,
  NOTIFICATION_CONFIG,
  EXPORT_CONFIG,
  AUTO_REFRESH_CONFIG,
  DATE_VALIDATIONS,
  TOOLTIP_CONFIG,
  HELP_URLS,
  SEARCH_FIELDS
};