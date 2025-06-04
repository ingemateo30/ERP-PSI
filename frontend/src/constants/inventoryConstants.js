// frontend/src/constants/inventoryConstants.js

export const EQUIPMENT_TYPES = [
  { value: 'router', label: 'Router' },
  { value: 'decodificador', label: 'Decodificador' },
  { value: 'cable', label: 'Cable' },
  { value: 'antena', label: 'Antena' },
  { value: 'splitter', label: 'Splitter' },
  { value: 'amplificador', label: 'Amplificador' },
  { value: 'otro', label: 'Otro' }
];

export const EQUIPMENT_STATES = [
  { value: 'disponible', label: 'Disponible', color: 'green' },
  { value: 'asignado', label: 'Asignado', color: 'blue' },
  { value: 'instalado', label: 'Instalado', color: 'purple' },
  { value: 'dañado', label: 'Dañado', color: 'red' },
  { value: 'perdido', label: 'Perdido', color: 'gray' },
  { value: 'mantenimiento', label: 'Mantenimiento', color: 'yellow' },
  { value: 'devuelto', label: 'Devuelto', color: 'indigo' }
];

export const HISTORY_ACTIONS = [
  { value: 'asignado', label: 'Asignado', icon: '👤', color: 'bg-blue-500' },
  { value: 'devuelto', label: 'Devuelto', icon: '↩️', color: 'bg-yellow-500' },
  { value: 'instalado', label: 'Instalado', icon: '🏠', color: 'bg-green-500' },
  { value: 'retirado', label: 'Retirado', icon: '📤', color: 'bg-orange-500' },
  { value: 'dañado', label: 'Dañado', icon: '🔧', color: 'bg-red-500' }
];

// Funciones utilitarias
export const getStateColor = (estado) => {
  const stateInfo = EQUIPMENT_STATES.find(s => s.value === estado);
  return stateInfo ? stateInfo.color : 'gray';
};

export const getStateLabel = (estado) => {
  const stateInfo = EQUIPMENT_STATES.find(s => s.value === estado);
  return stateInfo ? stateInfo.label : estado;
};

export const getTypeIcon = (tipo) => {
  const icons = {
    'router': '📡',
    'decodificador': '📺',
    'cable': '🔌',
    'antena': '📡',
    'splitter': '🔀',
    'amplificador': '🔊',
    'otro': '📦'
  };
  return icons[tipo] || '📦';
};

export const getActionInfo = (accion) => {
  const actionInfo = HISTORY_ACTIONS.find(a => a.value === accion);
  return actionInfo || {
    value: accion,
    label: accion,
    icon: '📦',
    color: 'bg-gray-500'
  };
};