// Estados de clientes
export const CLIENT_STATES = {
  ACTIVO: 'activo',
  SUSPENDIDO: 'suspendido',
  CORTADO: 'cortado',
  RETIRADO: 'retirado',
  INACTIVO: 'inactivo'
};

// Etiquetas de estados para mostrar en UI
export const CLIENT_STATE_LABELS = {
  [CLIENT_STATES.ACTIVO]: 'Activo',
  [CLIENT_STATES.SUSPENDIDO]: 'Suspendido',
  [CLIENT_STATES.CORTADO]: 'Cortado',
  [CLIENT_STATES.RETIRADO]: 'Retirado',
  [CLIENT_STATES.INACTIVO]: 'Inactivo'
};

// Colores para los estados
export const CLIENT_STATE_COLORS = {
  [CLIENT_STATES.ACTIVO]: 'green',
  [CLIENT_STATES.SUSPENDIDO]: 'yellow',
  [CLIENT_STATES.CORTADO]: 'red',
  [CLIENT_STATES.RETIRADO]: 'gray',
  [CLIENT_STATES.INACTIVO]: 'slate'
};

// Tipos de documento
export const DOCUMENT_TYPES = {
  CEDULA: 'cedula',
  NIT: 'nit',
  PASAPORTE: 'pasaporte',
  EXTRANJERIA: 'extranjeria'
};

// Etiquetas de tipos de documento
export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.CEDULA]: 'Cédula de Ciudadanía',
  [DOCUMENT_TYPES.NIT]: 'NIT',
  [DOCUMENT_TYPES.PASAPORTE]: 'Pasaporte',
  [DOCUMENT_TYPES.EXTRANJERIA]: 'Cédula de Extranjería'
};

// Estratos socioeconómicos
export const STRATOS = [
  { value: '1', label: 'Estrato 1' },
  { value: '2', label: 'Estrato 2' },
  { value: '3', label: 'Estrato 3' },
  { value: '4', label: 'Estrato 4' },
  { value: '5', label: 'Estrato 5' },
  { value: '6', label: 'Estrato 6' }
];

// Configuración de paginación
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMIT_OPTIONS: [10, 25, 50, 100],
  MAX_LIMIT: 100
};

// Acciones disponibles por rol
export const ROLE_PERMISSIONS = {
  administrador: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canView: true,
    canExport: true
  },
  supervisor: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canView: true,
    canExport: true
  },
  instalador: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canView: true,
    canExport: false
  }
};

export default {
  CLIENT_STATES,
  CLIENT_STATE_LABELS,
  CLIENT_STATE_COLORS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  STRATOS,
  PAGINATION_CONFIG,
  ROLE_PERMISSIONS
};