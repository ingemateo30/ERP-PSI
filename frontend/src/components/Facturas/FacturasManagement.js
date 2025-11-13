// frontend/src/components/Facturas/FacturasManagement.js - CORREGIDO COMPLETAMENTE
import React, { useState, useCallback, useEffect } from 'react';
import { Info, Calculator, PieChart, AlertTriangle } from 'lucide-react';
import { useFacturas, useFacturasAcciones } from '../../hooks/useFacturacionManual';
import FacturasStats from './FacturasStats';
import FacturasFilters from './FacturasFilters';
import FacturasList from './FacturasList';
import FacturaModal from './FacturaModal';
import PagoModal from './PagoModal';
import AnularModal from './AnularModal';
import { useAuth } from '../../contexts/AuthContext';


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
const { hasPermission } = useAuth();
  // Estados de UI
  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  // Manejar notificaciones mejorado
  const mostrarNotificacion = useCallback((mensaje, tipo = 'success') => {
    setNotificacion({ mensaje, tipo, timestamp: Date.now() });
    setTimeout(() => setNotificacion(null), 5000);
  }, []);

  // Limpiar errores al montar
  useEffect(() => {
    clearError();
  }, [clearError]);

  // ==========================================
  // MANEJO DE FILTROS CORREGIDO
  // ==========================================

  // Aplicar filtros desde FacturasFilters - CORREGIDO
  const handleBuscar = useCallback((filtrosBusqueda) => {
    console.log('🔍 [FacturasManagement] Aplicando filtros:', filtrosBusqueda);
    
    // Validar que los filtros no estén vacíos
    const filtrosValidos = Object.fromEntries(
      Object.entries(filtrosBusqueda).filter(([key, value]) => 
        value !== '' && value !== null && value !== undefined
      )
    );
    
    if (Object.keys(filtrosValidos).length === 0) {
      mostrarNotificacion('Por favor ingresa al menos un criterio de búsqueda', 'warning');
      return;
    }

    aplicarFiltros(filtrosValidos);
  }, [aplicarFiltros, mostrarNotificacion]);

  // Limpiar filtros completamente - CORREGIDO
  const handleLimpiarFiltros = useCallback(() => {
    console.log('🗑️ [FacturasManagement] Limpiando todos los filtros');
    limpiarFiltros();
    mostrarNotificacion('Filtros limpiados exitosamente', 'info');
  }, [limpiarFiltros, mostrarNotificacion]);

  // ==========================================
  // FUNCIONES DE MODALES CORREGIDAS
  // ==========================================

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
    console.log('✏️ [FacturasManagement] Intentando editar factura:', factura);
    
    // VALIDACIONES CORREGIDAS
    if (!factura || !factura.id) {
      mostrarNotificacion('Factura no válida para editar', 'error');
      return;
    }

    if (factura.estado === 'pagada') {
      mostrarNotificacion('No se puede editar una factura que ya está pagada', 'error');
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
    console.log('💰 [FacturasManagement] Abriendo modal de pago para:', factura);
    
    // VALIDACIONES CORREGIDAS
    if (!factura || !factura.id) {
      mostrarNotificacion('Factura no válida para marcar como pagada', 'error');
      return;
    }

    if (factura.estado === 'pagada') {
      mostrarNotificacion('Esta factura ya está marcada como pagada', 'warning');
      return;
    }

    if (factura.estado === 'anulada') {
      mostrarNotificacion('No se puede marcar como pagada una factura anulada', 'error');
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
    console.log('🚫 [FacturasManagement] Abriendo modal de anulación para:', factura);
    
    // VALIDACIONES CORREGIDAS
    if (!factura || !factura.id) {
      mostrarNotificacion('Factura no válida para anular', 'error');
      return;
    }

    if (factura.estado === 'anulada') {
      mostrarNotificacion('Esta factura ya está anulada', 'warning');
      return;
    }

    if (factura.estado === 'pagada') {
      mostrarNotificacion('No se puede anular una factura que ya está pagada', 'error');
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

  // ==========================================
  // ACCIONES DE FACTURAS CORREGIDAS
  // ==========================================

  const handleMarcarPagada = useCallback(async (datosPago) => {
    if (!modalState.facturaSeleccionada) {
      mostrarNotificacion('No hay factura seleccionada', 'error');
      return;
    }

    try {
      console.log('💰 [FacturasManagement] Marcando factura como pagada:', {
        factura: modalState.facturaSeleccionada.id,
        ...datosPago
      });
      
      // VALIDACIONES DE PAGO
      if (!datosPago.valor_pagado || datosPago.valor_pagado <= 0) {
        mostrarNotificacion('El valor del pago debe ser mayor a 0', 'error');
        return;
      }

      if (!datosPago.metodo_pago) {
        mostrarNotificacion('Debe seleccionar un método de pago', 'error');
        return;
      }

      const resultado = await marcarComoPagada(modalState.facturaSeleccionada.id, datosPago);
      
      handleCerrarModal();
      refrescar();
      mostrarNotificacion(
        `Factura ${modalState.facturaSeleccionada.numero_factura} marcada como pagada exitosamente`, 
        'success'
      );
      
    } catch (error) {
      console.error('❌ [FacturasManagement] Error al marcar como pagada:', error);
      mostrarNotificacion(
        error.message || 'Error al marcar la factura como pagada', 
        'error'
      );
    }
  }, [modalState.facturaSeleccionada, marcarComoPagada, handleCerrarModal, refrescar, mostrarNotificacion]);

  const handleAnularFactura = useCallback(async (motivo) => {
    if (!modalState.facturaSeleccionada) {
      mostrarNotificacion('No hay factura seleccionada para anular', 'error');
      return;
    }

    if (!motivo || motivo.trim().length < 10) {
      mostrarNotificacion('Debe proporcionar un motivo de anulación de al menos 10 caracteres', 'error');
      return;
    }

    try {
      console.log('🚫 [FacturasManagement] Anulando factura:', {
        factura: modalState.facturaSeleccionada.id,
        motivo: motivo.trim()
      });
      
      const resultado = await anularFactura(modalState.facturaSeleccionada.id, motivo.trim());
      
      handleCerrarModal();
      refrescar();
      mostrarNotificacion(
        `Factura ${modalState.facturaSeleccionada.numero_factura} anulada exitosamente`, 
        'success'
      );
      
    } catch (error) {
      console.error('❌ [FacturasManagement] Error al anular factura:', error);
      mostrarNotificacion(
        error.message || 'Error al anular la factura', 
        'error'
      );
    }
  }, [modalState.facturaSeleccionada, anularFactura, handleCerrarModal, refrescar, mostrarNotificacion]);

  const handleDuplicarFactura = useCallback(async (facturaId) => {
    if (!facturaId) {
      mostrarNotificacion('ID de factura no válido para duplicar', 'error');
      return;
    }

    try {
      console.log('📋 [FacturasManagement] Duplicando factura:', facturaId);
      
      const resultado = await duplicarFactura(facturaId);
      
      refrescar();
      mostrarNotificacion('Factura duplicada exitosamente', 'success');
      
    } catch (error) {
      console.error('❌ [FacturasManagement] Error al duplicar factura:', error);
      mostrarNotificacion(
        error.message || 'Error al duplicar la factura', 
        'error'
      );
    }
  }, [duplicarFactura, refrescar, mostrarNotificacion]);

  const handleDescargarPDF = useCallback(async (facturaId) => {
    if (!facturaId) {
      mostrarNotificacion('ID de factura no válido para descargar PDF', 'error');
      return;
    }

    try {
      console.log('📄 [FacturasManagement] Descargando PDF:', facturaId);
      
      const resultado = await descargarPDF(facturaId);
      
      mostrarNotificacion('PDF descargado exitosamente', 'success');
      
    } catch (error) {
      console.error('❌ [FacturasManagement] Error al descargar PDF:', error);
      mostrarNotificacion(
        error.message || 'Error al descargar el PDF', 
        'error'
      );
    }
  }, [descargarPDF, mostrarNotificacion]);

  const handleVerPDF = useCallback(async (facturaId) => {
    if (!facturaId) {
      mostrarNotificacion('ID de factura no válido para ver PDF', 'error');
      return;
    }

    try {
      console.log('👁️ [FacturasManagement] Visualizando PDF:', facturaId);
      
      const resultado = await verPDF(facturaId);
      
    } catch (error) {
      console.error('❌ [FacturasManagement] Error al ver PDF:', error);
      mostrarNotificacion(
        error.message || 'Error al visualizar el PDF', 
        'error'
      );
    }
  }, [verPDF, mostrarNotificacion]);

  // ==========================================
  // FUNCIÓN DE PRUEBA PDF
  // ==========================================
  const handleProbarPDF = useCallback(async () => {
    try {
      console.log('🧪 [FacturasManagement] Probando generación de PDF...');
      
      if (!facturas || facturas.length === 0) {
        mostrarNotificacion('No hay facturas disponibles para probar PDF', 'warning');
        return;
      }

      const primeraFactura = facturas[0];
      await handleVerPDF(primeraFactura.id);
      
    } catch (error) {
      console.error('❌ [FacturasManagement] Error en prueba de PDF:', error);
      mostrarNotificacion('Error al probar la funcionalidad de PDF', 'error');
    }
  }, [facturas, handleVerPDF, mostrarNotificacion]);

  // ==========================================
  // RENDER DEL COMPONENTE
  // ==========================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Notificaciones mejoradas */}
      {notificacion && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          notificacion.tipo === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : notificacion.tipo === 'warning'
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            : notificacion.tipo === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-start">
            <span className="mr-3 mt-0.5">
              {notificacion.tipo === 'success' ? '✅' : 
               notificacion.tipo === 'warning' ? '⚠️' :
               notificacion.tipo === 'info' ? 'ℹ️' : '❌'}
            </span>
            <div className="flex-1">
              <span className="font-medium">{notificacion.mensaje}</span>
            </div>
            <button
              onClick={() => setNotificacion(null)}
              className="ml-3 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Manejo de errores mejorado */}
      {(error || actionError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error en el Sistema</h3>
              <p className="text-sm text-red-700 mt-1">
                {error || actionError}
              </p>
            </div>
            <button
              onClick={() => {
                clearError();
                refrescar();
              }}
              className="ml-auto px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Header mejorado */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Facturas Manual
          </h1>
          <p className="text-gray-600 mt-2">
            Sistema PSI - Administra facturas, pagos y genera reportes
          </p>
          {facturas.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Mostrando {facturas.length} facturas 
              {pagination.total && ` de ${pagination.total} total`}
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setFiltrosAvanzados(!filtrosAvanzados)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filtrosAvanzados
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            🔧 {filtrosAvanzados ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
          
          {hasPermission('administrador') && (
  <button
    onClick={handleCrearFactura}
    className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:ring-offset-2 transition-all duration-200 font-medium"
  >
    ➕ Nueva Factura
  </button>
)}
          <button
            onClick={handleProbarPDF}
            disabled={loading || !facturas.length}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🧪 Probar PDF
          </button>

          <button
            onClick={refrescar}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Refrescar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <FacturasStats loading={loading} />

      {filtrosAvanzados && (
  <div className="mb-6">
    <FacturasFilters
      onBuscar={handleBuscar}
      onLimpiar={handleLimpiarFiltros}
      loading={loading}
    />
  </div>
)}

      {/* Lista de facturas mejorada */}
      <FacturasList
        facturas={facturas}
        loading={loading}
        pagination={pagination}
        onCambiarPagina={cambiarPagina}
        onEditarFactura={handleEditarFactura}
        onMarcarPagada={handleAbrirPago}
        onAnularFactura={handleAbrirAnular}
        onDuplicarFactura={handleDuplicarFactura}
        onDescargarPDF={handleDescargarPDF}
        onVerPDF={handleVerPDF}
      />

      {/* Modales */}
      {modalState.crear && (
        <FacturaModal
          isOpen={modalState.crear}
          onClose={handleCerrarModal}
          onSuccess={() => {
            handleCerrarModal();
            refrescar();
            mostrarNotificacion('Factura creada exitosamente', 'success');
          }}
        />
      )}

      {modalState.editar && modalState.facturaSeleccionada && (
        <FacturaModal
          isOpen={modalState.editar}
          onClose={handleCerrarModal}
          factura={modalState.facturaSeleccionada}
          modo="editar"
          onSuccess={() => {
            handleCerrarModal();
            refrescar();
            mostrarNotificacion('Factura actualizada exitosamente', 'success');
          }}
        />
      )}

      {modalState.pago && modalState.facturaSeleccionada && (
        <PagoModal
          isOpen={modalState.pago}
          onClose={handleCerrarModal}
          factura={modalState.facturaSeleccionada}
          onPagar={handleMarcarPagada}
          loading={actionLoading}
        />
      )}

      {modalState.anular && modalState.facturaSeleccionada && (
        <AnularModal
          isOpen={modalState.anular}
          onClose={handleCerrarModal}
          factura={modalState.facturaSeleccionada}
          onAnular={handleAnularFactura}
          loading={actionLoading}
        />
      )}

      {/* Indicador de carga global */}
      {(loading || actionLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="font-medium text-gray-900">
                {loading ? 'Cargando facturas...' : 'Procesando...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturasManagement;