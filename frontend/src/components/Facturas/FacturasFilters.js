// components/Facturas/FacturasFilters.js
import React, { useState, useEffect } from 'react';

const FacturasFilters = ({ onBuscar, filtrosIniciales = {}, mostrarAvanzados = false }) => {
  const [filtros, setFiltros] = useState({
    numero_factura: '',
    identificacion_cliente: '',
    nombre_cliente: '',
    estado: '',
    periodo_facturacion: '',
    fecha_desde: '',
    fecha_hasta: '',
    ruta: '',
    vencidas: false,
    ...filtrosIniciales
  });

  // Actualizar filtros cuando cambien los iniciales
  useEffect(() => {
    setFiltros(prev => ({ ...prev, ...filtrosIniciales }));
  }, [filtrosIniciales]);

  // Manejar cambios en inputs
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Buscar con filtros actuales
  const handleBuscar = (e) => {
    e.preventDefault();
    
    // Limpiar valores vacíos
    const filtrosLimpios = Object.keys(filtros).reduce((acc, key) => {
      const valor = filtros[key];
      if (valor !== '' && valor !== false && valor !== null && valor !== undefined) {
        acc[key] = valor;
      }
      return acc;
    }, {});

    onBuscar(filtrosLimpios);
  };

  // Limpiar filtros
  const handleLimpiar = () => {
    const filtrosVacios = {
      numero_factura: '',
      identificacion_cliente: '',
      nombre_cliente: '',
      estado: '',
      periodo_facturacion: '',
      fecha_desde: '',
      fecha_hasta: '',
      ruta: '',
      vencidas: false
    };
    
    setFiltros(filtrosVacios);
    onBuscar({});
  };

  // Buscar solo facturas vencidas
  const handleVerVencidas = () => {
    const filtrosVencidas = {
      ...filtros,
      estado: 'pendiente',
      vencidas: true
    };
    
    setFiltros(filtrosVencidas);
    onBuscar(filtrosVencidas);
  };

  return (
    <form onSubmit={handleBuscar} className="space-y-4">
      {/* Filtros básicos - siempre visibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Número de factura */}
        <div>
          <label htmlFor="numero_factura" className="block text-sm font-medium text-gray-700 mb-1">
            Número de Factura
          </label>
          <input
            type="text"
            id="numero_factura"
            name="numero_factura"
            value={filtros.numero_factura}
            onChange={handleInputChange}
            placeholder="Ej: FAC000123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Identificación del cliente */}
        <div>
          <label htmlFor="identificacion_cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Identificación Cliente
          </label>
          <input
            type="text"
            id="identificacion_cliente"
            name="identificacion_cliente"
            value={filtros.identificacion_cliente}
            onChange={handleInputChange}
            placeholder="Ej: 1005450340"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Nombre del cliente */}
        <div>
          <label htmlFor="nombre_cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Cliente
          </label>
          <input
            type="text"
            id="nombre_cliente"
            name="nombre_cliente"
            value={filtros.nombre_cliente}
            onChange={handleInputChange}
            placeholder="Ej: Juan Pérez"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Estado */}
        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            value={filtros.estado}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="vencida">Vencida</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>

      {/* Filtros avanzados */}
      {mostrarAvanzados && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filtros Avanzados</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Período de facturación */}
            <div>
              <label htmlFor="periodo_facturacion" className="block text-sm font-medium text-gray-700 mb-1">
                Período Facturación
              </label>
              <input
                type="month"
                id="periodo_facturacion"
                name="periodo_facturacion"
                value={filtros.periodo_facturacion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha desde */}
            <div>
              <label htmlFor="fecha_desde" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                id="fecha_desde"
                name="fecha_desde"
                value={filtros.fecha_desde}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label htmlFor="fecha_hasta" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                id="fecha_hasta"
                name="fecha_hasta"
                value={filtros.fecha_hasta}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Ruta */}
            <div>
              <label htmlFor="ruta" className="block text-sm font-medium text-gray-700 mb-1">
                Ruta
              </label>
              <input
                type="text"
                id="ruta"
                name="ruta"
                value={filtros.ruta}
                onChange={handleInputChange}
                placeholder="Ej: R01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Checkbox para facturas vencidas */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="vencidas"
                name="vencidas"
                checked={filtros.vencidas}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="vencidas" className="ml-2 block text-sm text-gray-700">
                Solo facturas vencidas
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3 pt-4">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          🔍 Buscar
        </button>

        <button
          type="button"
          onClick={handleLimpiar}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          🗑️ Limpiar
        </button>

        <button
          type="button"
          onClick={handleVerVencidas}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          ⚠️ Ver Vencidas
        </button>

        {/* Indicador de filtros activos */}
        {Object.values(filtros).some(value => value !== '' && value !== false) && (
          <div className="flex items-center text-sm text-blue-600">
            <span className="mr-2">🔧</span>
            <span>Filtros aplicados</span>
          </div>
        )}
      </div>

      {/* Resumen de filtros activos */}
      {Object.keys(filtros).some(key => filtros[key] !== '' && filtros[key] !== false) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Filtros Activos:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.keys(filtros).map(key => {
              const valor = filtros[key];
              if (valor === '' || valor === false) return null;
              
              const etiquetas = {
                numero_factura: 'Número',
                identificacion_cliente: 'ID Cliente',
                nombre_cliente: 'Cliente',
                estado: 'Estado',
                periodo_facturacion: 'Período',
                fecha_desde: 'Desde',
                fecha_hasta: 'Hasta',
                ruta: 'Ruta',
                vencidas: 'Vencidas'
              };

              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {etiquetas[key]}: {valor === true ? 'Sí' : valor}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </form>
  );
};

export default FacturasFilters;