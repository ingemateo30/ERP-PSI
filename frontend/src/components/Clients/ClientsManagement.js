// =============================================
// FRONTEND: frontend/src/components/Clients/ClientsManagement.js - ACTUALIZADO
// =============================================

import React, { useState } from 'react';
import { Plus, Search, Filter, Download, RefreshCw, UserX, Users, X, AlertCircle, Loader2, Ban } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../../constants/clientConstants';
import { clientService } from '../../services/clientService';
import clienteCompletoService from '../../services/clienteCompletoService';
import ClientsList from './ClientsList';
import ClientForm from './ClientForm';
import ClientEditForm from './ClientEditForm';
import ClientFilters from './ClientFilters';
import ClientStats from './ClientStats';
import ClientModal from './ClientModal';
import ClientesInactivos from './ClientesInactivos'; // NUEVO: Componente para clientes inactivos

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
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showInactivos, setShowInactivos] = useState(false); // NUEVO: Vista de clientes inactivos
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Estados para confirmaciones - NUEVO: Modal de inactivar
  const [showInactivarModal, setShowInactivarModal] = useState(false);
  const [inactivandoCliente, setInactivandoCliente] = useState(false);

  // Estados para cancelar instalación (suspender + anular factura/contrato)
  const [showCancelarInstalacionModal, setShowCancelarInstalacionModal] = useState(false);
  const [cancelandoInstalacion, setCancelandoInstalacion] = useState(false);

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
    setShowEditForm(true);
  };

  // NUEVO: Manejar inactivación de cliente con modal de confirmación
  const handleInactivarCliente = (client) => {
    setSelectedClient(client);
    setShowInactivarModal(true);
  };

  // NUEVO: Confirmar inactivación
  const confirmarInactivacion = async (motivo = 'voluntario', observaciones = '') => {
    if (!selectedClient) return;

    try {
      setInactivandoCliente(true);
      
      const response = await clientService.inactivarCliente(selectedClient.id, {
        motivo_inactivacion: motivo,
        observaciones_inactivacion: observaciones
      });

      if (response.success) {
        // Mostrar notificación de éxito
        if (window.showNotification) {
          window.showNotification('success', 'Cliente inactivado exitosamente');
        }
        
        // Refrescar lista
        refresh();
        
        // Cerrar modales
        setShowInactivarModal(false);
        setShowClientModal(false);
        setSelectedClient(null);
      } else {
        throw new Error(response.message || 'Error al inactivar cliente');
      }
    } catch (error) {
      console.error('Error inactivando cliente:', error);
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al inactivar cliente');
      }
    } finally {
      setInactivandoCliente(false);
    }
  };

  // Manejar cancelación de instalación (suspender + anular factura/contrato)
  const handleCancelarInstalacion = (client) => {
    setSelectedClient(client);
    setShowCancelarInstalacionModal(true);
  };

  const confirmarCancelarInstalacion = async (motivo, observaciones) => {
    if (!selectedClient) return;
    try {
      setCancelandoInstalacion(true);
      const response = await clienteCompletoService.cancelarInstalacion(selectedClient.id, {
        motivo,
        observaciones
      });
      if (response.success) {
        if (window.showNotification) {
          window.showNotification('success', `Instalación cancelada: ${response.data?.facturas_anuladas?.length || 0} factura(s) y ${response.data?.contratos_anulados?.length || 0} contrato(s) anulados`);
        }
        refresh();
        setShowCancelarInstalacionModal(false);
        setShowClientModal(false);
        setSelectedClient(null);
      } else {
        throw new Error(response.message || 'Error al cancelar instalación');
      }
    } catch (error) {
      console.error('Error cancelando instalación:', error);
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al cancelar la instalación');
      }
    } finally {
      setCancelandoInstalacion(false);
    }
  };

  // Cerrar formularios
  const handleCloseForm = () => {
    setShowForm(false);
    setShowEditForm(false);
    setSelectedClient(null);
  };

  // Después de crear/actualizar cliente
  const handleClientSaved = () => {
    handleCloseForm();
    refresh();
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = async () => {
    refresh();
  };

  // Función para exportar clientes
  const handleExport = async (formato) => {
    try {
      setExporting(true);
      setShowExportMenu(false);

      console.log('🔄 Iniciando exportación de clientes...', formato);

      const filtrosExportacion = {
        ...filters,
      };

      console.log('📋 Filtros para exportación:', filtrosExportacion);

      const resultado = await clientService.exportClients(formato, filtrosExportacion);

      if (resultado.success) {
        console.log('✅ Exportación exitosa');
        
        if (window.showNotification) {
          window.showNotification('success', resultado.message || `Archivo ${formato} descargado exitosamente`);
        }
      } else {
        throw new Error(resultado.message || 'Error en la exportación');
      }

    } catch (error) {
      console.error('❌ Error en exportación:', error);
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al exportar clientes');
      }
    } finally {
      setExporting(false);
    }
  };

  // NUEVO: Alternar vista de clientes inactivos
  const toggleInactivos = () => {
    setShowInactivos(!showInactivos);
    if (!showInactivos) {
      clearFilters(); // Limpiar filtros cuando se cambia de vista
    }
  };

  // NUEVO: Mostrar vista de clientes inactivos
  if (showInactivos) {
    return (
      <ClientesInactivos 
        onVolver={() => setShowInactivos(false)}
        permissions={permissions}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas - Solo admin/supervisor */}
{user?.rol !== 'instalador' && <ClientStats />}

      {/* Header y controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Título y botón principal */}
          <div className="flex items-center gap-4">
            <div>
  <h1 className="text-2xl font-bold text-gray-900">
    {user?.rol === 'instalador' ? 'Mis Clientes Asignados' : 'Gestión de Clientes'}
  </h1>
  <p className="text-gray-600 mt-1">
    {user?.rol === 'instalador' 
    }
  </p>
</div>
            
            {permissions.canCreate && user?.rol !== 'instalador' && (
  <button
    onClick={() => setShowForm(true)}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
  >
    <Plus className="w-4 h-4" />
    Nuevo Cliente
  </button>
)}
          </div>

          {/* Controles de acción */}
          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar clientes..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Botón para ver clientes inactivos - Solo admin/supervisor */}
{user?.rol !== 'instalador' && (
  <button
    onClick={toggleInactivos}
    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
  >
    <UserX className="w-4 h-4" />
    Ver Inactivos
  </button>
)}

            {/* Botón de refrescar */}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Exportar - Solo admin/supervisor */}
{permissions.canExport && user?.rol !== 'instalador' && (
  <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exportando...' : 'Exportar'}
                </button>

                {/* Menú de exportación */}
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Exportar a Excel
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Exportar a CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
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
            <AlertCircle className="w-5 h-5" />
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
        onDeleteClient={handleDeleteClient}
        onInactivarCliente={handleInactivarCliente}
        onCancelarInstalacion={handleCancelarInstalacion}
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
          onInactivar={() => handleInactivarCliente(selectedClient)} // NUEVO: Función para inactivar
          onDelete={handleDeleteClient}
          permissions={permissions}
        />
      )}

      {/* Formulario de creación de cliente */}
      {showForm && (
        <ClientForm
          client={null}
          onClose={handleCloseForm}
          onSave={handleClientSaved}
          permissions={permissions}
        />
      )}

      {/* Formulario de edición de cliente */}
      {showEditForm && selectedClient && (
        <ClientEditForm
          client={selectedClient}
          onClose={handleCloseForm}
          onSave={handleClientSaved}
        />
      )}

      {/* NUEVO: Modal de confirmación para inactivar */}
      {showInactivarModal && selectedClient && (
        <ModalInactivarCliente
          client={selectedClient}
          onConfirm={confirmarInactivacion}
          onCancel={() => {
            setShowInactivarModal(false);
            setSelectedClient(null);
          }}
          loading={inactivandoCliente}
        />
      )}

      {/* Modal: Cancelar instalación (suspender + anular factura/contrato) */}
      {showCancelarInstalacionModal && selectedClient && (
        <ModalCancelarInstalacion
          client={selectedClient}
          onConfirm={confirmarCancelarInstalacion}
          onCancel={() => {
            setShowCancelarInstalacionModal(false);
            setSelectedClient(null);
          }}
          loading={cancelandoInstalacion}
        />
      )}
    </div>
  );
};

// NUEVO: Componente Modal para confirmar inactivación
const ModalInactivarCliente = ({ client, onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState('voluntario');
  const [observaciones, setObservaciones] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(motivo, observaciones);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Inactivar Cliente
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {client.nombre} - {client.identificacion}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            
            {/* Advertencia */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Advertencia</span>
              </div>
              <p className="mt-1 text-sm text-yellow-600">
                Esta acción moverá el cliente a la lista de inactivos y cancelará todos sus servicios activos.
              </p>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de inactivación *
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="voluntario">Retiro Voluntario</option>
                <option value="mora">Por Mora</option>
                <option value="traslado">Traslado</option>
                <option value="fallecimiento">Fallecimiento</option>
                <option value="duplicado">Cliente Duplicado</option>
                <option value="otro">Otro Motivo</option>
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detalles adicionales sobre la inactivación..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Inactivando...
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  Inactivar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para cancelar instalación no realizada (suspende cliente + anula facturas/contratos)
const ModalCancelarInstalacion = ({ client, onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivo.trim()) return;
    onConfirm(motivo.trim(), observaciones.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Cancelar Instalación
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {client.nombre} — {client.identificacion}
            </p>
          </div>
          <button onClick={onCancel} disabled={loading} className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Acción irreversible</p>
                <p className="text-sm mt-1">
                  Esta acción suspenderá al cliente y anulará todas las facturas pendientes
                  y contratos activos para evitar cobros de mora y deudas pendientes.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la cancelación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Ej: No se pudo realizar la instalación técnica"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones adicionales
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Detalles adicionales (opcional)..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo.trim()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</>
              ) : (
                <><Ban className="w-4 h-4" />Suspender y Anular</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientsManagement;