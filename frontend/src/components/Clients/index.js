// Exportar todos los componentes del módulo de clientes
export { default as ClientsManagement } from './ClientsManagement';
export { default as ClientForm } from './ClientForm';
export { default as ClientsList } from './ClientsList';
export { default as ClientModal } from './ClientModal';
export { default as ClientStats } from './ClientStats';
export { default as ClientFilters } from './ClientFilters';

// Re-exportar hooks y servicios relacionados
export { useClients, useClientForm } from '../../hooks/useClients';
export { clientService } from '../../services/clientService';
export * from '../../constants/clientConstants';