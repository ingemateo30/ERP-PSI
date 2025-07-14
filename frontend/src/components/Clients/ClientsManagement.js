// =============================================
// FRONTEND: frontend/src/components/Clients/ClientsManagement.js - COMPLETO ACTUALIZADO
// =============================================

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, RefreshCw, UserX, Users, X, 
  AlertCircle, Loader2, Trash2, Edit, Eye, MapPin, Phone, Mail,
  Building, Wifi, Tv, Package, DollarSign, Check, Calculator
} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../../constants/clientConstants';
import { clientService } from '../../services/clientService';
import configService from '../../services/configService';
import ClientsList from './ClientsList';
import ClientEditForm from './ClientEditForm';
import ClientFilters from './ClientFilters';
import ClientStats from './ClientStats';
import ClientModal from './ClientModal';
import ClientesInactivos from './ClientesInactivos';

// ================================================================
// COMPONENTE PRINCIPAL: ServiciosSelector (NUEVO)
// ================================================================
const ServiciosSelector = ({ serviciosSeleccionados = [], onServiciosChange, planesDisponibles = [] }) => {
  const [servicios, setServicios] = useState(serviciosSeleccionados);

  useEffect(() => {
    setServicios(serviciosSeleccionados);
  }, [serviciosSeleccionados]);

  const agregarServicio = () => {
    const nuevoServicio = {
      id: Date.now(), // ID temporal
      planInternetId: '',
      planTelevisionId: '',
      direccionServicio: '',
      nombreSede: '',
      contactoSede: '',
      telefonoSede: '',
      precioPersonalizado: false,
      precioInternetCustom: '',
      precioTelevisionCustom: '',
      descuentoCombo: 0,
      observaciones: '',
      generarFacturaSeparada: false
    };
    
    const nuevosServicios = [...servicios, nuevoServicio];
    setServicios(nuevosServicios);
    onServiciosChange(nuevosServicios);
  };

  const actualizarServicio = (index, campo, valor) => {
    const nuevosServicios = [...servicios];
    nuevosServicios[index][campo] = valor;
    
    // Auto-calcular descuento combo si selecciona ambos servicios
    if (campo === 'planInternetId' || campo === 'planTelevisionId') {
      if (nuevosServicios[index].planInternetId && nuevosServicios[index].planTelevisionId) {
        // Aplicar descuento combo por defecto (15%)
        nuevosServicios[index].descuentoCombo = 15;
      } else {
        // Sin descuento si solo tiene un servicio
        nuevosServicios[index].descuentoCombo = 0;
      }
    }
    
    setServicios(nuevosServicios);
    onServiciosChange(nuevosServicios);
  };

  const eliminarServicio = (index) => {
    const nuevosServicios = servicios.filter((_, i) => i !== index);
    setServicios(nuevosServicios);
    onServiciosChange(nuevosServicios);
  };

  const calcularPrecioServicio = (servicio) => {
    let precioTotal = 0;
    let detalles = [];
    let planInternet = null;
    let planTV = null;

    // Plan de Internet
    if (servicio.planInternetId) {
      planInternet = planesDisponibles.find(p => p.id == servicio.planInternetId);
      const precioInternet = servicio.precioPersonalizado ? 
        parseFloat(servicio.precioInternetCustom) || 0 : 
        parseFloat(planInternet?.precio) || 0;
      
      precioTotal += precioInternet;
      detalles.push(`Internet ${planInternet?.nombre || ''}: $${precioInternet.toLocaleString()}`);
    }

    // Plan de Televisión
    if (servicio.planTelevisionId) {
      planTV = planesDisponibles.find(p => p.id == servicio.planTelevisionId);
      const precioTV = servicio.precioPersonalizado ? 
        parseFloat(servicio.precioTelevisionCustom) || 0 : 
        parseFloat(planTV?.precio) || 0;
      
      precioTotal += precioTV;
      detalles.push(`TV ${planTV?.nombre || ''}: $${precioTV.toLocaleString()}`);
    }

    // Descuento combo
    let descuentoAplicado = 0;
    if (servicio.descuentoCombo > 0 && precioTotal > 0) {
      descuentoAplicado = precioTotal * (servicio.descuentoCombo / 100);
      precioTotal -= descuentoAplicado;
      detalles.push(`Descuento combo (${servicio.descuentoCombo}%): -$${descuentoAplicado.toLocaleString()}`);
    }

    return {
      total: precioTotal,
      detalles: detalles,
      tieneInternet: !!servicio.planInternetId,
      tieneTV: !!servicio.planTelevisionId,
      esCombo: !!(servicio.planInternetId && servicio.planTelevisionId),
      planInternet: planInternet,
      planTV: planTV,
      descuentoAplicado: descuentoAplicado
    };
  };

  const planesInternet = planesDisponibles.filter(plan => plan.tipo === 'internet');
  const planesTV = planesDisponibles.filter(plan => plan.tipo === 'television');

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Servicios a Contratar
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona los servicios que desea contratar el cliente. Puede agregar múltiples servicios para diferentes sedes.
          </p>
        </div>
        <button
          type="button"
          onClick={agregarServicio}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Servicio
        </button>
      </div>

      {/* Lista de servicios */}
      {servicios.map((servicio, index) => {
        const precio = calcularPrecioServicio(servicio);
        
        return (
          <div key={servicio.id} className="border border-gray-300 rounded-lg bg-white shadow-sm">
            {/* Encabezado del servicio */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {precio.tieneInternet && <Wifi className="w-4 h-4 text-blue-600" />}
                  {precio.tieneTV && <Tv className="w-4 h-4 text-purple-600" />}
                  {precio.esCombo && <Package className="w-4 h-4 text-green-600" />}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Servicio #{index + 1}
                    {servicio.nombreSede && ` - ${servicio.nombreSede}`}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {precio.tieneInternet && precio.tieneTV ? 'Combo Internet + TV' : 
                     precio.tieneInternet ? 'Solo Internet' : 
                     precio.tieneTV ? 'Solo Televisión' : 'Sin servicios seleccionados'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  ${precio.total.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => eliminarServicio(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Eliminar servicio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del servicio */}
            <div className="p-4 space-y-4">
              {/* Selección de servicios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan de Internet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Plan de Internet
                  </label>
                  <select
                    value={servicio.planInternetId}
                    onChange={(e) => actualizarServicio(index, 'planInternetId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin Internet</option>
                    {planesInternet.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} - {plan.velocidad_bajada}MB - ${plan.precio.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan de Televisión */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    Plan de Televisión
                  </label>
                  <select
                    value={servicio.planTelevisionId}
                    onChange={(e) => actualizarServicio(index, 'planTelevisionId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin Televisión</option>
                    {planesTV.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} - {plan.canales_tv} canales - ${plan.precio.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Información de la sede */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección del Servicio *
                  </label>
                  <input
                    type="text"
                    value={servicio.direccionServicio}
                    onChange={(e) => actualizarServicio(index, 'direccionServicio', e.target.value)}
                    placeholder="Dirección donde se prestará el servicio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Nombre de la Sede
                  </label>
                  <input
                    type="text"
                    value={servicio.nombreSede}
                    onChange={(e) => actualizarServicio(index, 'nombreSede', e.target.value)}
                    placeholder="ej: Sede Principal, Sucursal Norte"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Teléfono de la Sede
                  </label>
                  <input
                    type="tel"
                    value={servicio.telefonoSede}
                    onChange={(e) => actualizarServicio(index, 'telefonoSede', e.target.value)}
                    placeholder="Teléfono de contacto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Contacto de la sede */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contacto de la Sede
                </label>
                <input
                  type="text"
                  value={servicio.contactoSede}
                  onChange={(e) => actualizarServicio(index, 'contactoSede', e.target.value)}
                  placeholder="Nombre del contacto en esta sede"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Opciones avanzadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Precio personalizado */}
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={servicio.precioPersonalizado}
                      onChange={(e) => actualizarServicio(index, 'precioPersonalizado', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Precio personalizado
                    </span>
                  </label>

                  {servicio.precioPersonalizado && (
                    <div className="space-y-2 ml-6">
                      {servicio.planInternetId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Precio Internet Personalizado
                          </label>
                          <input
                            type="number"
                            value={servicio.precioInternetCustom}
                            onChange={(e) => actualizarServicio(index, 'precioInternetCustom', e.target.value)}
                            placeholder="Precio personalizado internet"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                      {servicio.planTelevisionId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Precio TV Personalizado
                          </label>
                          <input
                            type="number"
                            value={servicio.precioTelevisionCustom}
                            onChange={(e) => actualizarServicio(index, 'precioTelevisionCustom', e.target.value)}
                            placeholder="Precio personalizado TV"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Descuento combo */}
                {servicio.planInternetId && servicio.planTelevisionId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Descuento Combo (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={servicio.descuentoCombo}
                      onChange={(e) => actualizarServicio(index, 'descuentoCombo', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Facturación separada */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={servicio.generarFacturaSeparada}
                    onChange={(e) => actualizarServicio(index, 'generarFacturaSeparada', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Generar factura separada para este servicio
                  </span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Si se marca, este servicio se facturará en una factura independiente
                </p>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={servicio.observaciones}
                  onChange={(e) => actualizarServicio(index, 'observaciones', e.target.value)}
                  rows="2"
                  placeholder="Observaciones específicas para este servicio..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Resumen de precios */}
            <div className="p-4 bg-blue-50 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <h5 className="font-medium text-blue-900">Resumen del Servicio:</h5>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                {precio.detalles.map((detalle, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{detalle.split(':')[0]}:</span>
                    <span className="font-medium">{detalle.split(':')[1]}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t border-blue-200 pt-1 mt-2">
                  <span>Total Mensual:</span>
                  <span>${precio.total.toLocaleString()}</span>
                </div>
                {precio.esCombo && (
                  <div className="text-xs text-green-700 mt-1">
                    ✓ Descuento combo aplicado
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Estado vacío */}
      {servicios.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay servicios agregados</h3>
          <p className="text-gray-600 mb-4">
            Agrega al menos un servicio para crear el cliente
          </p>
          <button
            type="button"
            onClick={agregarServicio}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar Primer Servicio
          </button>
        </div>
      )}

      {/* Resumen total */}
      {servicios.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Resumen Total:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-700">Servicios:</span>
              <div className="font-semibold">{servicios.length}</div>
            </div>
            <div>
              <span className="text-green-700">Con Internet:</span>
              <div className="font-semibold">
                {servicios.filter(s => s.planInternetId).length}
              </div>
            </div>
            <div>
              <span className="text-green-700">Con TV:</span>
              <div className="font-semibold">
                {servicios.filter(s => s.planTelevisionId).length}
              </div>
            </div>
            <div>
              <span className="text-green-700">Total Mensual:</span>
              <div className="font-semibold text-lg">
                ${servicios.reduce((total, servicio) => total + calcularPrecioServicio(servicio).total, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================================================================
// COMPONENTE PRINCIPAL: ClientsManagement
// ================================================================
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

  // Estados del componente
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showInactivos, setShowInactivos] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el nuevo formulario
  const [showNewForm, setShowNewForm] = useState(false);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);

  // Estados para exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Estados para confirmaciones
  const [showInactivarModal, setShowInactivarModal] = useState(false);
  const [inactivandoCliente, setInactivandoCliente] = useState(false);

  // Permisos del usuario actual
  const permissions = ROLE_PERMISSIONS[user?.role] || ROLE_PERMISSIONS.instalador;

  // Cargar planes disponibles al montar el componente
  useEffect(() => {
    cargarPlanesDisponibles();
  }, []);

  const cargarPlanesDisponibles = async () => {
    try {
      setLoadingPlanes(true);
      const response = await configService.getServicePlans();
      if (response.success) {
        // Filtrar solo planes activos y no combos
        const planesActivos = response.data.filter(plan => 
          plan.activo && plan.tipo !== 'combo'
        );
        setPlanesDisponibles(planesActivos);
      }
    } catch (error) {
      console.error('Error cargando planes:', error);
    } finally {
      setLoadingPlanes(false);
    }
  };

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

  // Manejar creación de cliente con múltiples servicios
  const handleCreateClientWithServices = () => {
    setServiciosSeleccionados([]);
    setShowNewForm(true);
  };

  // Manejar guardado de cliente con servicios
  const handleSaveClientWithServices = async (datosCliente) => {
    try {
      if (serviciosSeleccionados.length === 0) {
        alert('Debe agregar al menos un servicio');
        return;
      }

      const response = await clientService.createClientWithServices({
        datosCliente,
        servicios: serviciosSeleccionados
      });

      if (response.success) {
        refresh();
        setShowNewForm(false);
        setServiciosSeleccionados([]);
        if (window.showNotification) {
          window.showNotification('success', 'Cliente creado exitosamente con todos los servicios');
        }
      }
    } catch (error) {
      console.error('Error creando cliente:', error);
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al crear cliente');
      }
    }
  };

  // Manejar inactivación de cliente
  const handleInactivarCliente = (client) => {
    setSelectedClient(client);
    setShowInactivarModal(true);
  };

  // Confirmar inactivación
  const confirmarInactivacion = async (motivo = 'voluntario', observaciones = '') => {
    if (!selectedClient) return;

    try {
      setInactivandoCliente(true);
      
      const response = await clientService.inactivarCliente(selectedClient.id, {
        motivo_inactivacion: motivo,
        observaciones_inactivacion: observaciones
      });

      if (response.success) {
        if (window.showNotification) {
          window.showNotification('success', 'Cliente inactivado exitosamente');
        }
        refresh();
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

  // Cerrar formularios
  const handleCloseForm = () => {
    setShowForm(false);
    setShowEditForm(false);
    setShowNewForm(false);
    setSelectedClient(null);
    setServiciosSeleccionados([]);
  };

  // Manejar cliente guardado
  const handleClientSaved = () => {
    refresh();
    handleCloseForm();
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = async (client) => {
    if (!window.confirm(`¿Está seguro de eliminar el cliente ${client.nombre}?`)) {
      return;
    }

    try {
      const response = await clientService.deleteClient(client.id);
      if (response.success) {
        refresh();
        if (window.showNotification) {
          window.showNotification('success', 'Cliente eliminado exitosamente');
        }
      }
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      if (window.showNotification) {
        window.showNotification('error', 'Error al eliminar cliente');
      }
    }
  };

  // Render del componente principal
  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <ClientStats />

      {/* Barra de herramientas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/* Toggle vista inactivos */}
            <button
              onClick={() => setShowInactivos(!showInactivos)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showInactivos
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserX className="w-4 h-4 mr-1 inline" />
              {showInactivos ? 'Ver Activos' : 'Ver Inactivos'}
            </button>

            {/* Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showFilters
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4 mr-1 inline" />
              Filtros
            </button>

            {/* Refrescar */}
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 inline ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>

            {/* Exportar */}
            {permissions.canExport && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Download className="w-4 h-4 mr-1 inline" />
                  Exportar
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                    <button
                      onClick={() => {/* Lógica de exportar Excel */}}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Exportar a Excel
                    </button>
                    <button
                      onClick={() => {/* Lógica de exportar PDF */}}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Exportar a PDF
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Crear cliente */}
            {permissions.canCreate && (
              <button
                onClick={handleCreateClientWithServices}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            )}
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ClientFilters
              filters={filters}
              onFiltersChange={applyFilters}
              onClearFilters={clearFilters}
            />
          </div>
        )}
      </div>

      {/* Contenido principal */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      {showInactivos ? (
        <ClientesInactivos />
      ) : (
        <ClientsList
          clients={clients}
          pagination={pagination}
          loading={loading}
          onClientSelect={handleClientSelect}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
          onInactivarCliente={handleInactivarCliente}
          onPageChange={changePage}
          onLimitChange={changeLimit}
          permissions={permissions}
        />
      )}

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
          onInactivar={() => handleInactivarCliente(selectedClient)}
          onDelete={handleDeleteClient}
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

      {/* NUEVO: Formulario de creación con múltiples servicios */}
      {showNewForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Crear Nuevo Cliente con Servicios
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const datosCliente = Object.fromEntries(formData.entries());
              handleSaveClientWithServices(datosCliente);
            }}>
              {/* Datos del cliente */}
              <div className="mb-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Información del Cliente
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Identificación *
                    </label>
                    <input
                      type="text"
                      name="identificacion"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estrato
                    </label>
                    <select
                      name="estrato"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">Estrato 1</option>
                      <option value="2">Estrato 2</option>
                      <option value="3">Estrato 3</option>
                      <option value="4">Estrato 4</option>
                      <option value="5">Estrato 5</option>
                      <option value="6">Estrato 6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Cliente
                    </label>
                    <select
                      name="tipo_cliente"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="persona_natural">Persona Natural</option>
                      <option value="persona_juridica">Persona Jurídica</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección Principal
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Selector de servicios */}
              <div className="mb-8">
                {loadingPlanes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Cargando planes disponibles...</span>
                  </div>
                ) : (
                  <ServiciosSelector
                    serviciosSeleccionados={serviciosSeleccionados}
                    onServiciosChange={setServiciosSeleccionados}
                    planesDisponibles={planesDisponibles}
                  />
                )}
              </div>

              {/* Opciones adicionales */}
              <div className="mb-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  Opciones Adicionales
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="generar_documentos"
                      defaultChecked
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Generar contratos automáticamente</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="enviar_bienvenida"
                      defaultChecked
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Enviar email de bienvenida</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="programar_instalacion"
                      defaultChecked
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Programar instalación</span>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={serviciosSeleccionados.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Crear Cliente y Servicios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para inactivar */}
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
    </div>
  );
};

// ================================================================
// COMPONENTE: Modal para confirmar inactivación
// ================================================================
const ModalInactivarCliente = ({ client, onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState('voluntario');
  const [observaciones, setObservaciones] = useState('');

  const handleConfirm = () => {
    onConfirm(motivo, observaciones);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">
              Inactivar Cliente
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            ¿Está seguro de inactivar al cliente <strong>{client.nombre}</strong>?
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de inactivación
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="voluntario">Retiro voluntario</option>
                <option value="mora">Mora prolongada</option>
                <option value="incumplimiento">Incumplimiento contrato</option>
                <option value="mudanza">Mudanza fuera de cobertura</option>
                <option value="otro">Otro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Inactivar Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsManagement