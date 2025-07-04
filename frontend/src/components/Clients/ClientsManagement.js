// frontend/src/components/Clients/ClientsManagement.js - VERSIÓN CORREGIDA

import React, { useState } from 'react';
import { Plus, Search, Filter, Download, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../../constants/clientConstants';
import { clientService } from '../../services/clientService';
import ClientsList from './ClientsList';
import ClientForm from './ClientForm';
import ClientFilters from './ClientFilters';
import ClientStats from './ClientStats';
import ClientModal from './ClientModal';

const ClientsManagement = () => {
  const { user } = useAuth();
  const {
    clients,
    pagination,
    filters,
    loading,
    error,
    changePage,
    changeLimit,
    applyFilters,
    clearFilters,
    refresh
  } = useClients();

  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NUEVO: Estados para exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Permisos del usuario actual
  const permissions = ROLE_PERMISSIONS[user?.role] || ROLE_PERMISSIONS.instalador;

  // Manejar búsqueda
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      applyFilters({ ...filters, nombre: term });
    } else if (term.length === 0) {
      const { nombre, ...restFilters } = filters;
      applyFilters(restFilters);
    }
  };

  // Manejar selección de cliente
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  // Manejar edición de cliente
  const handleEditClient = (client) => {
    setSelectedClient(client);
    setShowForm(true);
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedClient(null);
  };

  // Después de crear/actualizar cliente
  const handleClientSaved = () => {
    handleCloseForm();
    refresh();
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = async () => {
    // Esta función se implementará en ClientModal
    refresh();
  };

  // CORRECCIÓN: Función para exportar clientes
  const handleExport = async (formato) => {
    try {
      setExporting(true);
      setShowExportMenu(false);

      console.log('🔄 Iniciando exportación de clientes...', formato);

      // Preparar filtros para exportación
      const filtrosExportacion = {
        ...filters,
        // Agregar filtros específicos si es necesario
      };

      console.log('📋 Filtros para exportación:', filtrosExportacion);

      const resultado = await clientService.exportClients(formato, filtrosExportacion);

      if (resultado.success) {
        console.log('✅ Exportación exitosa');
        
        // Mostrar notificación de éxito
        if (window.showNotification) {
          window.showNotification('success', resultado.message || `Archivo ${formato} descargado exitosamente`);
        } else {
          alert(resultado.message || `Archivo ${formato} descargado exitosamente`);
        }
      } else {
        throw new Error(resultado.message || 'Error en la exportación');
      }

    } catch (error) {
      console.error('❌ Error en exportación:', error);
      
      const mensajeError = error.message || 'Error al exportar clientes';
      
      // Mostrar notificación de error
      if (window.showNotification) {
        window.showNotification('error', mensajeError);
      } else {
        alert(mensajeError);
      }
    } finally {
      setExporting(false);
    }
  };

  // CORRECCIÓN: Componente del menú de exportación
  const ExportMenu = () => {
    if (!showExportMenu) return null;

    return (
      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="py-2">
          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
            Formato de exportación
          </div>
          
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <div>
              <div className="font-medium">Excel (.xlsx)</div>
              <div className="text-xs text-gray-500">Recomendado para análisis</div>
            </div>
          </button>
          
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-medium">CSV (.csv)</div>
              <div className="text-xs text-gray-500">Compatible con otros sistemas</div>
            </div>
          </button>
        </div>
        
        {Object.keys(filters).length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
            Se aplicarán los filtros actuales
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600">
            Administra la información de tus clientes
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {permissions.canExport && (
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting || loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exportar
                  </>
                )}
              </button>
              
              <ExportMenu />
            </div>
          )}
          
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          
          {permissions.canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Click outside para cerrar menú de exportación */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {/* Estadísticas */}
      <ClientStats />

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por nombre, identificación o teléfono..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Botón de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters || Object.keys(filters).length > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {Object.keys(filters).length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ClientFilters
              filters={filters}
              onApplyFilters={applyFilters}
              onClearFilters={clearFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Error al cargar clientes</span>
          </div>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Lista de clientes */}
      <ClientsList
        clients={clients}
        pagination={pagination}
        loading={loading}
        onClientSelect={handleClientSelect}
        onEditClient={handleEditClient}
        onPageChange={changePage}
        onLimitChange={changeLimit}
        permissions={permissions}
      />

      {/* Modal de cliente */}
      {showClientModal && selectedClient && (
        <ClientModal
          client={selectedClient}
          onClose={() => {
            setShowClientModal(false);
            setSelectedClient(null);
          }}
          onEdit={() => {
            setShowClientModal(false);
            handleEditClient(selectedClient);
          }}
          onDelete={handleDeleteClient}
          permissions={permissions}
        />
      )}

      {/* Formulario de cliente */}
      {showForm && (
        <ClientForm
          client={selectedClient}
          onClose={handleCloseForm}
          onSave={handleClientSaved}
          permissions={permissions}
        />
      )}
    </div>
  );
};

export default ClientsManagement;