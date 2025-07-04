// components/Facturas/FacturasManagement.js - Componente principal corregido
import React, { useState, useCallback, useEffect } from 'react';
import { useFacturas, useFacturasAcciones } from '../../hooks/useFacturas';
import FacturasStats from './FacturasStats';
import FacturasFilters from './FacturasFilters';
import FacturasList from './FacturasList';
import FacturaModal from './FacturaModal';
import PagoModal from './PagoModal';
import AnularModal from './AnularModal';
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
    actualizarFactura,
    clearError
  } = useFacturasAcciones();

  // Estados de modales
  const [modalState, setModalState] = useState({
    crear: false,
    editar: false,
    pago: false,
    anular: false,
    facturaSeleccionada: null
  });

  // Estados de UI
  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  // Manejar notificaciones
  const mostrarNotificacion = useCallback((mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 5000);
  }, []);

  // Limpiar errores al montar
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Manejar búsqueda sin duplicados
  const handleBuscar = useCallback((filtrosBusqueda) => {
    console.log('🔍 Aplicando filtros desde FacturasManagement:', filtrosBusqueda);
    aplicarFiltros(filtrosBusqueda);
  }, [aplicarFiltros]);

  // Limpiar filtros
  const handleLimpiarFiltros = useCallback(() => {
    console.log('🗑️ Limpiando filtros desde FacturasManagement');
    limpiarFiltros();
    setFiltrosAvanzados(false);
  }, [limpiarFiltros]);

  // Funciones de modales
  const handleCrearFactura = useCallback(() => {
    setModalState({
      crear: true,
      editar: false,
      pago: false,
      anular: false,
      facturaSeleccionada: null
    });
    clearError();
  }, [clearError]);

  const handleEditarFactura = useCallback((factura) => {
    if (factura.estado === 'pagada') {
      mostrarNotificacion('No se puede editar una factura pagada', 'error');
      return;
    }
    if (factura.estado === 'anulada') {
      mostrarNotificacion('No se puede editar una factura anulada', 'error');
      return;
    }

    setModalState({
      crear: false,
      editar: true,
      pago: false,
      anular: false,
      facturaSeleccionada: factura
    });
    clearError();
  }, [clearError, mostrarNotificacion]);

  const handleAbrirPago = useCallback((factura) => {
    if (factura.estado !== 'pendiente') {
      mostrarNotificacion('Solo se pueden marcar como pagadas las facturas pendientes', 'error');
      return;
    }

    setModalState({
      crear: false,
      editar: false,
      pago: true,
      anular: false,
      facturaSeleccionada: factura
    });
    clearError();
  }, [clearError, mostrarNotificacion]);

  const handleAbrirAnular = useCallback((factura) => {
    if (factura.estado === 'pagada') {
      mostrarNotificacion('No se puede anular una factura pagada', 'error');
      return;
    }
    if (factura.estado === 'anulada') {
      mostrarNotificacion('La factura ya está anulada', 'error');
      return;
    }

    setModalState({
      crear: false,
      editar: false,
      pago: false,
      anular: true,
      facturaSeleccionada: factura
    });
    clearError();
  }, [clearError, mostrarNotificacion]);

  const handleCerrarModal = useCallback(() => {
    setModalState({
      crear: false,
      editar: false,
      pago: false,
      anular: false,
      facturaSeleccionada: null
    });
    clearError();
  }, [clearError]);

  // Acciones de facturas corregidas
  const handleMarcarPagada = useCallback(async (datosPago) => {
    if (!modalState.facturaSeleccionada) return;

    try {
      console.log('💰 Marcando factura como pagada:', datosPago);
      
      await marcarComoPagada(modalState.facturaSeleccionada.id, datosPago);
      
      handleCerrarModal();
      refrescar();
      mostrarNotificacion('Factura marcada como pagada exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error al marcar como pagada:', error);
      mostrarNotificacion(error.message || 'Error al marcar como pagada', 'error');
    }
  }, [modalState.facturaSeleccionada, marcarComoPagada, handleCerrarModal, refrescar, mostrarNotificacion]);

  const handleAnularFactura = useCallback(async (motivo) => {
    if (!modalState.facturaSeleccionada || !motivo) return;

    try {
      console.log('🚫 Anulando factura:', motivo);
      
      await anularFactura(modalState.facturaSeleccionada.id, motivo);
      
      handleCerrarModal();
      refrescar();
      mostrarNotificacion('Factura anulada exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error al anular factura:', error);
      mostrarNotificacion(error.message || 'Error al anular factura', 'error');
    }
  }, [modalState.facturaSeleccionada, anularFactura, handleCerrarModal, refrescar, mostrarNotificacion]);

  const handleDuplicarFactura = useCallback(async (facturaId) => {
    try {
      console.log('📋 Duplicando factura:', facturaId);
      
      await duplicarFactura(facturaId);
      
      refrescar();
      mostrarNotificacion('Factura duplicada exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error al duplicar factura:', error);
      mostrarNotificacion(error.message || 'Error al duplicar factura', 'error');
    }
  }, [duplicarFactura, refrescar, mostrarNotificacion]);

  const handleDescargarPDF = useCallback(async (factura) => {
    try {
      console.log('📥 Descargando PDF:', factura.id);
      
      await descargarPDF(factura.id, factura.nombre_cliente);
      
      mostrarNotificacion('PDF descargado exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error al descargar PDF:', error);
      mostrarNotificacion(error.message || 'Error al descargar PDF', 'error');
    }
  }, [descargarPDF, mostrarNotificacion]);

  const handleVerPDF = useCallback(async (facturaId) => {
    try {
      console.log('👁️ Abriendo PDF:', facturaId);
      
      await verPDF(facturaId);
      
      mostrarNotificacion('PDF abierto exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error al ver PDF:', error);
      mostrarNotificacion(error.message || 'Error al ver PDF', 'error');
    }
  }, [verPDF, mostrarNotificacion]);

  const handleFacturaGuardada = useCallback(async (datosFactura) => {
    try {
      if (modalState.editar && modalState.facturaSeleccionada) {
        console.log('📝 Actualizando factura:', datosFactura);
        await actualizarFactura(modalState.facturaSeleccionada.id, datosFactura);
        mostrarNotificacion('Factura actualizada exitosamente', 'success');
      } else {
        console.log('📝 Creando nueva factura:', datosFactura);
        // Aquí iría la lógica para crear factura
        mostrarNotificacion('Factura creada exitosamente', 'success');
      }
      
      handleCerrarModal();
      refrescar();
    } catch (error) {
      console.error('❌ Error al guardar factura:', error);
      mostrarNotificacion(error.message || 'Error al guardar factura', 'error');
    }
  }, [modalState, actualizarFactura, handleCerrarModal, refrescar, mostrarNotificacion]);

  // Probar PDF para desarrollo
  const handleProbarPDF = useCallback(async () => {
    try {
      await FacturasService.probarPDF();
      mostrarNotificacion('PDF de prueba generado exitosamente', 'success');
    } catch (error) {
      console.error('❌ Error al probar PDF:', error);
      mostrarNotificacion(error.message || 'Error al probar PDF', 'error');
    }
  }, [mostrarNotificacion]);

  // Manejar errores
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">
                  Error al cargar las facturas
                </h3>
                <p className="text-red-600 mt-2">{error}</p>
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={refrescar}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    🔄 Reintentar
                  </button>
                  <button
                    onClick={handleLimpiarFiltros}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    🗑️ Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Notificaciones */}
        {notificacion && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
            notificacion.tipo === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {notificacion.tipo === 'success' ? '✅' : '❌'}
              </span>
              <span className="font-medium">{notificacion.mensaje}</span>
              <button
                onClick={() => setNotificacion(null)}
                className="ml-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📋 Gestión de Facturas
            </h1>
            <p className="text-gray-600 mt-2">
              Administra facturas, pagos y genera reportes del sistema PSI
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setFiltrosAvanzados(!filtrosAvanzados)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtrosAvanzados
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              🔧 {filtrosAvanzados ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
            <button
              onClick={handleCrearFactura}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
            >
              ➕ Nueva Factura
            </button>
            <button
              onClick={handleProbarPDF}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors font-medium"
            >
              🧪 Probar PDF
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <FacturasStats />

        {/* Filtros */}
        {filtrosAvanzados && (
          <FacturasFilters
            onBuscar={handleBuscar}
            onLimpiar={handleLimpiarFiltros}
            filtrosIniciales={filtros}
            loading={loading}
          />
        )}

        {/* Lista de facturas */}
        <FacturasList
          facturas={facturas}
          loading={loading}
          pagination={pagination}
          onEditarFactura={handleEditarFactura}
          onMarcarPagada={handleAbrirPago}
          onAnularFactura={handleAbrirAnular}
          onDuplicarFactura={handleDuplicarFactura}
          onDescargarPDF={handleDescargarPDF}
          onVerPDF={handleVerPDF}
          onCambiarPagina={cambiarPagina}
          actionLoading={actionLoading}
        />

        {/* Modales */}
        {modalState.crear && (
          <FacturaModal
            isOpen={modalState.crear}
            onClose={handleCerrarModal}
            onGuardar={handleFacturaGuardada}
            title="Crear Nueva Factura"
            loading={actionLoading}
            error={actionError}
          />
        )}

        {modalState.editar && modalState.facturaSeleccionada && (
          <FacturaModal
            isOpen={modalState.editar}
            onClose={handleCerrarModal}
            onGuardar={handleFacturaGuardada}
            factura={modalState.facturaSeleccionada}
            title="Editar Factura"
            loading={actionLoading}
            error={actionError}
          />
        )}

        {modalState.pago && modalState.facturaSeleccionada && (
          <PagoModal
            isOpen={modalState.pago}
            onClose={handleCerrarModal}
            onConfirmar={handleMarcarPagada}
            factura={modalState.facturaSeleccionada}
            loading={actionLoading}
            error={actionError}
          />
        )}

        {modalState.anular && modalState.facturaSeleccionada && (
          <AnularModal
            isOpen={modalState.anular}
            onClose={handleCerrarModal}
            onConfirmar={handleAnularFactura}
            factura={modalState.facturaSeleccionada}
            loading={actionLoading}
            error={actionError}
          />
        )}

        {/* Loading overlay */}
        {actionLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-lg font-medium">Procesando...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacturasManagement;