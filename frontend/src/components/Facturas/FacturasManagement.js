// components/Facturas/FacturasManagement.js
import React, { useState } from 'react';
import { useFacturas, useFacturasAcciones } from '../../hooks/useFacturas';
import FacturasStats from './FacturasStats';
import FacturasFilters from './FacturasFilters';
import FacturasList from './FacturasList';
import FacturaModal from './FacturaModal';
import PagoModal from './PagoModal';
import FacturasService from '../../services/facturasService';

const FacturasManagement = () => {
  const {
    facturas,
    loading,
    error,
    pagination,
    filtros,
    aplicarFiltros,
    cambiarPagina,
    limpiarFiltros,
    refrescar
  } = useFacturas();

  const {
    loading: actionLoading,
    error: actionError,
    marcarComoPagada,
    anularFactura,
    duplicarFactura,
    descargarPDF,
    verPDF,
    clearError
  } = useFacturasAcciones();

  const [modalState, setModalState] = useState({
    crear: false,
    editar: false,
    pago: false,
    facturaSeleccionada: null
  });

  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);

  // Manejar búsqueda
  const handleBuscar = (filtrosBusqueda) => {
    aplicarFiltros(filtrosBusqueda);
  };

  // Limpiar filtros
  const handleLimpiarFiltros = () => {
    limpiarFiltros();
    setFiltrosAvanzados(false);
  };

  // Abrir modal para crear factura
  const handleCrearFactura = () => {
    setModalState({
      crear: true,
      editar: false,
      pago: false,
      facturaSeleccionada: null
    });
  };

  // Abrir modal para editar factura
  const handleEditarFactura = (factura) => {
    setModalState({
      crear: false,
      editar: true,
      pago: false,
      facturaSeleccionada: factura
    });
  };

  // Abrir modal de pago
  const handleAbrirPago = (factura) => {
    setModalState({
      crear: false,
      editar: false,
      pago: true,
      facturaSeleccionada: factura
    });
  };

  // Cerrar modales
  const handleCerrarModal = () => {
    setModalState({
      crear: false,
      editar: false,
      pago: false,
      facturaSeleccionada: null
    });
    clearError();
  };

  // Marcar como pagada
  const handleMarcarPagada = async (facturaId, datosPago) => {
    try {
      await marcarComoPagada(facturaId, datosPago);
      handleCerrarModal();
      refrescar();
      
      // Mostrar notificación de éxito
      alert('Factura marcada como pagada exitosamente');
    } catch (error) {
      console.error('Error al marcar como pagada:', error);
    }
  };

  // Anular factura
  const handleAnularFactura = async (facturaId, motivo) => {
    if (!motivo || motivo.trim().length < 10) {
      alert('Debe proporcionar un motivo de anulación de al menos 10 caracteres');
      return;
    }

    if (window.confirm('¿Está seguro de anular esta factura? Esta acción no se puede deshacer.')) {
      try {
        await anularFactura(facturaId, motivo);
        refrescar();
        alert('Factura anulada exitosamente');
      } catch (error) {
        console.error('Error al anular factura:', error);
        alert('Error al anular factura: ' + error.message);
      }
    }
  };

  // Duplicar factura
  const handleDuplicarFactura = async (facturaId) => {
    if (window.confirm('¿Desea duplicar esta factura?')) {
      try {
        await duplicarFactura(facturaId);
        refrescar();
        alert('Factura duplicada exitosamente');
      } catch (error) {
        console.error('Error al duplicar factura:', error);
        alert('Error al duplicar factura: ' + error.message);
      }
    }
  };

  // Descargar PDF
  const handleDescargarPDF = async (factura) => {
    try {
      await descargarPDF(factura.id, factura.nombre_cliente);
      alert('PDF descargado exitosamente');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      alert('Error al descargar PDF: ' + error.message);
    }
  };

  // Ver PDF
  const handleVerPDF = async (facturaId) => {
    try {
      await verPDF(facturaId);
    } catch (error) {
      console.error('Error al ver PDF:', error);
      alert('Error al ver PDF: ' + error.message);
    }
  };

  // Probar PDF
  const handleProbarPDF = async () => {
    try {
      await FacturasService.probarPDF();
    } catch (error) {
      console.error('Error al probar PDF:', error);
      alert('Error al probar PDF: ' + error.message);
    }
  };

  // Manejar éxito al crear/editar
  const handleFacturaGuardada = () => {
    handleCerrarModal();
    refrescar();
    alert('Factura guardada exitosamente');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error al cargar facturas</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={refrescar}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Facturas</h1>
            <p className="text-gray-600 mt-1">
              Administra facturas, pagos y genera reportes
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleProbarPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              🧪 Probar PDF
            </button>
            <button
              onClick={handleCrearFactura}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              ➕ Nueva Factura
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <FacturasStats />

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Filtros de Búsqueda</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltrosAvanzados(!filtrosAvanzados)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {filtrosAvanzados ? 'Filtros Simples' : 'Filtros Avanzados'}
              </button>
              <button
                onClick={handleLimpiarFiltros}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Limpiar
              </button>
            </div>
          </div>
          
          <FacturasFilters
            onBuscar={handleBuscar}
            filtrosIniciales={filtros}
            mostrarAvanzados={filtrosAvanzados}
          />
        </div>

        {/* Lista de Facturas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Facturas ({pagination.totalItems || 0})
              </h2>
              <button
                onClick={refrescar}
                disabled={loading}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                🔄 {loading ? 'Cargando...' : 'Refrescar'}
              </button>
            </div>
          </div>

          <FacturasList
            facturas={facturas}
            loading={loading || actionLoading}
            pagination={pagination}
            onCambiarPagina={cambiarPagina}
            onEditarFactura={handleEditarFactura}
            onMarcarPagada={handleAbrirPago}
            onAnularFactura={handleAnularFactura}
            onDuplicarFactura={handleDuplicarFactura}
            onDescargarPDF={handleDescargarPDF}
            onVerPDF={handleVerPDF}
          />
        </div>

        {/* Modales */}
        {(modalState.crear || modalState.editar) && (
          <FacturaModal
            isOpen={true}
            isEditing={modalState.editar}
            factura={modalState.facturaSeleccionada}
            onClose={handleCerrarModal}
            onSuccess={handleFacturaGuardada}
          />
        )}

        {modalState.pago && (
          <PagoModal
            isOpen={true}
            factura={modalState.facturaSeleccionada}
            onClose={handleCerrarModal}
            onConfirm={handleMarcarPagada}
            loading={actionLoading}
            error={actionError}
          />
        )}

        {/* Error de acciones */}
        {actionError && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span className="text-red-800">{actionError}</span>
              <button
                onClick={clearError}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacturasManagement;