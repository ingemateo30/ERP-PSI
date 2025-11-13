// frontend/src/components/Facturas/FacturasFilters.js - REHECHO COMPLETAMENTE
import React, { useState, useEffect } from 'react';
import { ESTADOS_FACTURA, METODOS_PAGO } from '../../hooks/useFacturacionManual';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const FacturasFilters = ({ 
  onBuscar, 
  onLimpiar, 
  filtrosIniciales = {}, 
  loading = false 
}) => {
  // ==========================================
  // ESTADO DE FILTROS
  // ==========================================
  const [filtros, setFiltros] = useState({
    search: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    numero_factura: '',
    cliente_id: '',
    ruta: '',
    monto_min: '',
    monto_max: '',
    periodo_facturacion: '',
    vencimiento_desde: '',
    vencimiento_hasta: '',
    metodo_pago: '',
    dias_vencimiento: '',
    incluir_anuladas: false
  });

  const [mostrarAvanzados, setMostrarAvanzados] = useState(false);
  const [errores, setErrores] = useState({});

  // ==========================================
  // SINCRONIZAR FILTROS INICIALES
  // ==========================================
  useEffect(() => {
    if (filtrosIniciales && Object.keys(filtrosIniciales).length > 0) {
      setFiltros(prev => ({
        ...prev,
        ...filtrosIniciales
      }));
    }
  }, [filtrosIniciales]);

  // ==========================================
  // MANEJADOR DE CAMBIOS - CORREGIDO
  // ==========================================
  const handleCambio = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    
    // Limpiar error del campo cuando se modifica
    if (errores[campo]) {
      setErrores(prev => {
        const nuevosErrores = { ...prev };
        delete nuevosErrores[campo];
        return nuevosErrores;
      });
    }
  };

  // ==========================================
  // VALIDACIONES
  // ==========================================
  const validarFiltros = () => {
    const nuevosErrores = {};

    // Validar rango de fechas de emisión
    if (filtros.fecha_desde && filtros.fecha_hasta) {
      const desde = new Date(filtros.fecha_desde);
      const hasta = new Date(filtros.fecha_hasta);
      if (desde > hasta) {
        nuevosErrores.fecha_hasta = 'La fecha hasta debe ser posterior a la fecha desde';
      }
    }

    // Validar rango de fechas de vencimiento
    if (filtros.vencimiento_desde && filtros.vencimiento_hasta) {
      const desde = new Date(filtros.vencimiento_desde);
      const hasta = new Date(filtros.vencimiento_hasta);
      if (desde > hasta) {
        nuevosErrores.vencimiento_hasta = 'La fecha de vencimiento hasta debe ser posterior';
      }
    }

    // Validar rango de montos
    if (filtros.monto_min && filtros.monto_max) {
      const min = parseFloat(filtros.monto_min);
      const max = parseFloat(filtros.monto_max);
      if (!isNaN(min) && !isNaN(max) && min > max) {
        nuevosErrores.monto_max = 'El monto máximo debe ser mayor al mínimo';
      }
    }

    // Validar días de vencimiento
    if (filtros.dias_vencimiento) {
      const dias = parseInt(filtros.dias_vencimiento);
      if (isNaN(dias) || dias < 0) {
        nuevosErrores.dias_vencimiento = 'Debe ser un número positivo';
      }
    }

    return nuevosErrores;
  };

  // ==========================================
  // APLICAR BÚSQUEDA
  // ==========================================
  const handleBuscar = (e) => {
    if (e) e.preventDefault();
    
    console.log('🔍 Aplicando filtros:', filtros);
    
    // Validar
    const nuevosErrores = validarFiltros();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      console.warn('⚠️ Errores de validación:', nuevosErrores);
      return;
    }

    // Limpiar filtros vacíos
    const filtrosLimpios = {};
    Object.keys(filtros).forEach(key => {
      const valor = filtros[key];
      if (typeof valor === 'boolean') {
        filtrosLimpios[key] = valor;
      } else if (valor !== '' && valor !== null && valor !== undefined) {
        filtrosLimpios[key] = valor;
      }
    });

    // Verificar que haya al menos un filtro
    if (Object.keys(filtrosLimpios).length === 0) {
      setErrores({ general: 'Debe especificar al menos un criterio de búsqueda' });
      return;
    }

    setErrores({});
    
    if (onBuscar) {
      onBuscar(filtrosLimpios);
    }
  };

  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================
  const handleLimpiarTodo = () => {
    console.log('🗑️ Limpiando filtros');
    
    const filtrosVacios = {
      search: '',
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
      numero_factura: '',
      cliente_id: '',
      ruta: '',
      monto_min: '',
      monto_max: '',
      periodo_facturacion: '',
      vencimiento_desde: '',
      vencimiento_hasta: '',
      metodo_pago: '',
      dias_vencimiento: '',
      incluir_anuladas: false
    };
    
    setFiltros(filtrosVacios);
    setErrores({});
    setMostrarAvanzados(false);
    
    if (onLimpiar) {
      onLimpiar();
    }
  };

  // ==========================================
  // DETECTAR FILTROS ACTIVOS
  // ==========================================
  const tienesFiltrosActivos = () => {
    return Object.entries(filtros).some(([key, value]) => {
      if (typeof value === 'boolean') return value === true;
      return value !== '' && value !== null && value !== undefined;
    });
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Filtros de Búsqueda
            </h3>
            {tienesFiltrosActivos() && (
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Activos
              </span>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => setMostrarAvanzados(!mostrarAvanzados)}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span>{mostrarAvanzados ? 'Ocultar' : 'Mostrar'} filtros avanzados</span>
            {mostrarAvanzados ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* FORMULARIO */}
      <form onSubmit={handleBuscar} className="p-6">
        {/* ERROR GENERAL */}
        {errores.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <X className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700">{errores.general}</p>
          </div>
        )}

        {/* FILTROS BÁSICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda general */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Búsqueda General
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtros.search}
                onChange={(e) => handleCambio('search', e.target.value)}
                placeholder="Número de factura, cliente, identificación..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => handleCambio('estado', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            >
              <option value="">Todos los estados</option>
              <option value={ESTADOS_FACTURA.PENDIENTE}>Pendientes</option>
              <option value={ESTADOS_FACTURA.PAGADA}>Pagadas</option>
              <option value={ESTADOS_FACTURA.VENCIDA}>Vencidas</option>
              <option value={ESTADOS_FACTURA.ANULADA}>Anuladas</option>
            </select>
          </div>

          {/* Número de factura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              N° Factura
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtros.numero_factura}
                onChange={(e) => handleCambio('numero_factura', e.target.value)}
                placeholder="F000001"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* FILTROS AVANZADOS */}
        {mostrarAvanzados && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
            {/* Fechas de emisión */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Fechas de Emisión
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filtros.fecha_desde}
                    onChange={(e) => handleCambio('fecha_desde', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filtros.fecha_hasta}
                    onChange={(e) => handleCambio('fecha_hasta', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  {errores.fecha_hasta && (
                    <p className="mt-1 text-xs text-red-600">{errores.fecha_hasta}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fechas de vencimiento */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-red-600" />
                Fechas de Vencimiento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vence Desde
                  </label>
                  <input
                    type="date"
                    value={filtros.vencimiento_desde}
                    onChange={(e) => handleCambio('vencimiento_desde', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vence Hasta
                  </label>
                  <input
                    type="date"
                    value={filtros.vencimiento_hasta}
                    onChange={(e) => handleCambio('vencimiento_hasta', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  {errores.vencimiento_hasta && (
                    <p className="mt-1 text-xs text-red-600">{errores.vencimiento_hasta}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Días Vencidos (mín)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={filtros.dias_vencimiento}
                    onChange={(e) => handleCambio('dias_vencimiento', e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  {errores.dias_vencimiento && (
                    <p className="mt-1 text-xs text-red-600">{errores.dias_vencimiento}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Montos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                Rangos de Monto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Monto Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filtros.monto_min}
                    onChange={(e) => handleCambio('monto_min', e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Monto Máximo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filtros.monto_max}
                    onChange={(e) => handleCambio('monto_max', e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  {errores.monto_max && (
                    <p className="mt-1 text-xs text-red-600">{errores.monto_max}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Ubicación y métodos de pago */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                Ubicación y Métodos de Pago
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ruta
                  </label>
                  <input
                    type="text"
                    value={filtros.ruta}
                    onChange={(e) => handleCambio('ruta', e.target.value)}
                    placeholder="R001"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Método de Pago
                  </label>
                  <select
                    value={filtros.metodo_pago}
                    onChange={(e) => handleCambio('metodo_pago', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  >
                    <option value="">Todos</option>
                    <option value={METODOS_PAGO.EFECTIVO}>Efectivo</option>
                    <option value={METODOS_PAGO.TRANSFERENCIA}>Transferencia</option>
                    <option value={METODOS_PAGO.TARJETA_CREDITO}>Tarjeta Crédito</option>
                    <option value={METODOS_PAGO.TARJETA_DEBITO}>Tarjeta Débito</option>
                    <option value={METODOS_PAGO.CHEQUE}>Cheque</option>
                    <option value={METODOS_PAGO.PSE}>PSE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ID Cliente
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={filtros.cliente_id}
                    onChange={(e) => handleCambio('cliente_id', e.target.value)}
                    placeholder="12345"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Opciones adicionales */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Opciones Adicionales
              </h4>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtros.incluir_anuladas}
                  onChange={(e) => handleCambio('incluir_anuladas', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">
                  Incluir facturas anuladas
                </span>
              </label>
            </div>
          </div>
        )}

        {/* BOTONES */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Buscar Facturas
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLimpiarTodo}
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            <X className="w-4 h-4 mr-2" />
            Limpiar Filtros
          </button>
        </div>

        {/* INFORMACIÓN DE AYUDA */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Search className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Consejos de Búsqueda
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• La búsqueda general busca en número de factura, cliente e identificación</li>
                <li>• Usa los filtros avanzados para búsquedas más específicas</li>
                <li>• Combina múltiples filtros para resultados más precisos</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FacturasFilters;