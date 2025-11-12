// frontend/src/components/Facturas/FacturasFilters.js - COMPONENTE COMPLETAMENTE CORREGIDO
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ESTADOS_FACTURA, METODOS_PAGO } from '../../hooks/useFacturacionManual';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  User,
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
  // ESTADO DE FILTROS - CORREGIDO COMPLETAMENTE
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

  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({});

  // ==========================================
  // EFECTOS - SINCRONIZACIÓN CON PROPS
  // ==========================================
  useEffect(() => {
    if (Object.keys(filtrosIniciales).length > 0) {
      console.log('🔄 [FacturasFilters] Sincronizando filtros iniciales:', filtrosIniciales);
      setFiltros(prev => ({
        ...prev,
        ...filtrosIniciales
      }));
    }
  }, [JSON.stringify(filtrosIniciales)]);

  // ==========================================
  // VALIDACIONES DE FORMULARIO
  // ==========================================
  const validarFiltros = (filtrosAValidar) => {
    const errores = {};

    if (filtrosAValidar.fecha_desde && filtrosAValidar.fecha_hasta) {
      const fechaDesde = new Date(filtrosAValidar.fecha_desde);
      const fechaHasta = new Date(filtrosAValidar.fecha_hasta);
      if (fechaDesde > fechaHasta) {
        errores.fecha_hasta = 'La fecha hasta debe ser posterior a la fecha desde';
      }
    }

    if (filtrosAValidar.vencimiento_desde && filtrosAValidar.vencimiento_hasta) {
      const vencDesde = new Date(filtrosAValidar.vencimiento_desde);
      const vencHasta = new Date(filtrosAValidar.vencimiento_hasta);
      if (vencDesde > vencHasta) {
        errores.vencimiento_hasta = 'La fecha de vencimiento hasta debe ser posterior a la fecha desde';
      }
    }

    if (filtrosAValidar.monto_min && filtrosAValidar.monto_max) {
      const montoMin = parseFloat(filtrosAValidar.monto_min);
      const montoMax = parseFloat(filtrosAValidar.monto_max);
      if (montoMin > montoMax) {
        errores.monto_max = 'El monto máximo debe ser mayor al monto mínimo';
      }
    }

    if (filtrosAValidar.dias_vencimiento) {
      const dias = parseInt(filtrosAValidar.dias_vencimiento);
      if (isNaN(dias) || dias < 0) {
        errores.dias_vencimiento = 'Los días de vencimiento deben ser un número positivo';
      }
    }

    return errores;
  };

  // ==========================================
  // APLICAR FILTROS - CORREGIDO
  // ==========================================
  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('🔍 [FacturasFilters] Aplicando filtros:', filtros);
    
    const errores = validarFiltros(filtros);
    
    if (Object.keys(errores).length > 0) {
      setErroresValidacion(errores);
      console.warn('⚠️ [FacturasFilters] Errores de validación:', errores);
      return;
    }
    
    const filtrosLimpios = Object.fromEntries(
      Object.entries(filtros).filter(([key, value]) => {
        if (typeof value === 'boolean') return true;
        return value !== '' && value !== null && value !== undefined;
      })
    );
    
    if (Object.keys(filtrosLimpios).length === 0) {
      setErroresValidacion({ general: 'Debe especificar al menos un criterio de búsqueda' });
      return;
    }
    
    setErroresValidacion({});
    
    if (onBuscar) {
      onBuscar(filtrosLimpios);
    }
  };

  // ==========================================
  // LIMPIAR FILTROS - CORREGIDO
  // ==========================================
  const handleLimpiar = () => {
    console.log('🗑️ [FacturasFilters] Limpiando todos los filtros');
    
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
    setErroresValidacion({});
    setFiltrosAvanzados(false);
    
    if (onLimpiar) {
      onLimpiar();
    }
  };

  // ==========================================
  // BÚSQUEDA RÁPIDA
  // ==========================================
  const handleBusquedaRapida = (termino) => {
    if (!termino || termino.trim().length < 2) return;
    
    console.log('⚡ [FacturasFilters] Búsqueda rápida:', termino);
    
    if (onBuscar) {
      onBuscar({ search: termino.trim() });
    }
  };

  // ==========================================
  // DETECTAR SI HAY FILTROS ACTIVOS
  // ==========================================
  const hayFiltrosActivos = Object.entries(filtros).some(([key, value]) => {
    if (typeof value === 'boolean') return value;
    return value !== '' && value !== null && value !== undefined;
  });

  // ==========================================
  // OPCIONES DE SELECT
  // ==========================================
  const opcionesEstado = [
    { value: '', label: 'Todos los estados' },
    { value: ESTADOS_FACTURA.PENDIENTE, label: 'Pendientes' },
    { value: ESTADOS_FACTURA.PAGADA, label: 'Pagadas' },
    { value: ESTADOS_FACTURA.VENCIDA, label: 'Vencidas' },
    { value: ESTADOS_FACTURA.ANULADA, label: 'Anuladas' }
  ];

  const opcionesMetodoPago = [
    { value: '', label: 'Todos los métodos' },
    { value: METODOS_PAGO.EFECTIVO, label: 'Efectivo' },
    { value: METODOS_PAGO.TRANSFERENCIA, label: 'Transferencia' },
    { value: METODOS_PAGO.TARJETA_CREDITO, label: 'Tarjeta de Crédito' },
    { value: METODOS_PAGO.TARJETA_DEBITO, label: 'Tarjeta de Débito' },
    { value: METODOS_PAGO.CHEQUE, label: 'Cheque' },
    { value: METODOS_PAGO.PSE, label: 'PSE' }
  ];

  // ==========================================
  // COMPONENTE DE CAMPO CON ERROR
  // ==========================================
  const CampoConError = ({ campo, children, className = '' }) => (
    <div className={`${className}`}>
      {children}
      {erroresValidacion[campo] && (
        <p className="mt-1 text-xs text-red-600">
          {erroresValidacion[campo]}
        </p>
      )}
    </div>
  );

  // ==========================================
  // RENDER DEL COMPONENTE
  // ==========================================
 return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header del filtro */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Filtros de Búsqueda
            </h3>
            {hayFiltrosActivos && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Filtros activos
              </span>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => setFiltrosAvanzados(!filtrosAvanzados)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>{filtrosAvanzados ? 'Ocultar' : 'Mostrar'} filtros avanzados</span>
            {filtrosAvanzados ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Error general */}
        {erroresValidacion.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{erroresValidacion.general}</p>
          </div>
        )}

        {/* Búsqueda básica */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Búsqueda general */}
          <CampoConError campo="search" className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Búsqueda General
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtros.search}
                onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Número de factura, cliente, identificación..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </CampoConError>

          {/* Estado */}
          <CampoConError campo="estado">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {opcionesEstado.map(opcion => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </CampoConError>

          {/* Número de factura */}
          <CampoConError campo="numero_factura">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Factura
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtros.numero_factura}
                onChange={(e) => setFiltros(prev => ({ ...prev, numero_factura: e.target.value }))}
                placeholder="F000001, F000002..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </CampoConError>
        </div>

        {/* Filtros avanzados */}
        <div className={`transition-all duration-300 ease-in-out ${
          filtrosAvanzados 
            ? 'opacity-100 max-h-none' 
            : 'opacity-0 max-h-0 overflow-hidden'
        }`}>
          {filtrosAvanzados && (
            <div className="space-y-6 pt-6 border-t border-gray-200">
              {/* Fechas de emisión */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Fechas de Emisión
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CampoConError campo="fecha_desde">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={filtros.fecha_desde}
                      onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>
                  
                  <CampoConError campo="fecha_hasta">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={filtros.fecha_hasta}
                      onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>
                </div>
              </div>

              {/* Fechas de vencimiento */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Fechas de Vencimiento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CampoConError campo="vencimiento_desde">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vencimiento Desde
                    </label>
                    <input
                      type="date"
                      value={filtros.vencimiento_desde}
                      onChange={(e) => setFiltros(prev => ({ ...prev, vencimiento_desde: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>
                  
                  <CampoConError campo="vencimiento_hasta">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vencimiento Hasta
                    </label>
                    <input
                      type="date"
                      value={filtros.vencimiento_hasta}
                      onChange={(e) => setFiltros(prev => ({ ...prev, vencimiento_hasta: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>

                  <CampoConError campo="dias_vencimiento">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Días Vencidos (mínimo)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={filtros.dias_vencimiento}
                      onChange={(e) => setFiltros(prev => ({ ...prev, dias_vencimiento: e.target.value }))}
                      placeholder="30, 60, 90..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>
                </div>
              </div>

              {/* Montos */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Rangos de Monto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CampoConError campo="monto_min">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filtros.monto_min}
                      onChange={(e) => setFiltros(prev => ({ ...prev, monto_min: e.target.value }))}
                      placeholder="50000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>
                  
                  <CampoConError campo="monto_max">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto Máximo
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filtros.monto_max}
                      onChange={(e) => setFiltros(prev => ({ ...prev, monto_max: e.target.value }))}
                      placeholder="500000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>
                </div>
              </div>

              {/* Ubicación y pago */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Ubicación y Métodos de Pago
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CampoConError campo="ruta">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ruta
                    </label>
                    <input
                      type="text"
                      value={filtros.ruta}
                      onChange={(e) => setFiltros(prev => ({ ...prev, ruta: e.target.value }))}
                      placeholder="R001, R002..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>

                  <CampoConError campo="metodo_pago">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={filtros.metodo_pago}
                      onChange={(e) => setFiltros(prev => ({ ...prev, metodo_pago: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {opcionesMetodoPago.map(opcion => (
                        <option key={opcion.value} value={opcion.value}>
                          {opcion.label}
                        </option>
                      ))}
                    </select>
                  </CampoConError>

                  <CampoConError campo="cliente_id">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID Cliente
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={filtros.cliente_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, cliente_id: e.target.value }))}
                      placeholder="12345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </CampoConError>
                </div>
              </div>

              {/* Opciones adicionales */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Opciones Adicionales
                </h4>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filtros.incluir_anuladas}
                      onChange={(e) => setFiltros(prev => ({ ...prev, incluir_anuladas: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Incluir facturas anuladas
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Buscando...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Search className="w-4 h-4 mr-2" />
                Buscar Facturas
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={handleLimpiar}
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <div className="flex items-center justify-center">
              <X className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </div>
          </button>

          {/* Búsqueda rápida */}
          <div className="flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Búsqueda rápida..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBusquedaRapida(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Presiona Enter para búsqueda rápida
            </p>
          </div>
        </div>

        {/* Información de ayuda */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Search className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">
                Consejos de Búsqueda
              </h4>
              <div className="mt-1 text-sm text-blue-800">
                <ul className="list-disc list-inside space-y-1">
                  <li>La búsqueda general incluye número de factura, nombre del cliente e identificación</li>
                  <li>Usa los filtros avanzados para búsquedas más específicas</li>
                  <li>Las facturas en mora se calculan automáticamente excluyendo las pagadas</li>
                  <li>Combina múltiples filtros para resultados más precisos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FacturasFilters;